'use strict';

var RSVP = require('rsvp');
var fs = require('fs');
var path = require('path');
var FormData = require('form-data');
var zlib = require('zlib');

var BasePlugin = require('ember-cli-deploy-plugin');

module.exports = {
  name: 'ember-cli-deploy-rollbar-sourcemap',

  createDeployPlugin: function(options) {
    var DeployPlugin = BasePlugin.extend({
      name: options.name,

      defaultConfig: Object.freeze({
        distDir: function(context) {
          return context.distDir;
        },
        distFiles: function(context) {
          return context.distFiles;
        },
        gzippedFiles: function(context) {
          return context.gzippedFiles || [];
        },
        revisionKey: function(context) {
          if (context.revisionData) {
            return context.revisionData.revisionKey;
          } else {
            return process.env.SOURCE_VERSION || '';
          }
        },
        environment: function(context) {
          var rollbarConfig = context.config["rollbar-sourcemap"].rollbarConfig;
          var buildConfig = context.config.build;
          var environment = rollbarConfig ? rollbarConfig.environment : false;
          return environment || buildConfig.environment || 'production';
        },
        additionalFiles: [],
      }),
      requiredConfig: Object.freeze(['accessServerToken', 'publicUrl']),

      upload: function() {
        var log = this.log.bind(this);
        var distDir = this.readConfig('distDir');
        var distFiles = this.readConfig('distFiles');
        var accessServerToken = this.readConfig('accessServerToken');
        var revisionKey = this.readConfig('revisionKey');

        log('Uploading sourcemaps to Rollbar', { verbose: true });

        var publicUrl = this.readConfig('publicUrl');

        var promiseArray = [];
        var jsMapPairs = fetchJSMapPairs(distFiles, publicUrl, distDir);

        for (var i = 0; i < jsMapPairs.length; i++) {
          var mapFilePath = jsMapPairs[i].mapFile;
          var jsFilePath = jsMapPairs[i].jsFile;
          var fileSize = fs.statSync(mapFilePath)['size'];

          var formData = new FormData();
          formData.append('access_token', accessServerToken);
          formData.append('minified_url', jsFilePath);
          formData.append(
            'source_map',
            fs.createReadStream(mapFilePath),
            { knownLength: fileSize }
          );
          formData.append('version', revisionKey);
          log(`Uploading sourcemap to Rollbar: version=${revisionKey} minified_url=${jsFilePath}`, { verbose: true });
          var promise = new RSVP.Promise(function(resolve, reject) {
            formData.submit('https://api.rollbar.com/api/1/sourcemap', function(error, result) {
              if(error) {
                reject(error);
              }
              result.resume();

              result.on('end', function() {
                resolve();
              });
            });
          });
          promiseArray.push(promise);
        }

        return RSVP.all(promiseArray);
      },

      didDeploy: function(context) {
        var didDeployHook = this.readConfig('didDeploy');

        if (didDeployHook) {
          return didDeployHook.call(this, context);
        }

        var accessServerToken = this.readConfig('accessServerToken');
        var environment = this.readConfig('environment');
        var revision = this.readConfig('revisionKey');
        var username = this.readConfig('username');

        var formData = new FormData();

        formData.append('access_token', accessServerToken);
        formData.append('revision', revision);
        formData.append('environment', environment);

        if (username) {
          formData.append('local_username', username);
        }

        return new RSVP.Promise(function(resolve, reject) {
          formData.submit('https://api.rollbar.com/api/1/deploy', function(error, result) {
            if (error) {
              reject(error);
            }
            result.resume();

            result.on('end', function() {
              resolve();
            });
          });
        });
      },

      _readSourceMap(mapFilePath) {
        var relativeMapFilePath = mapFilePath.replace(this.readConfig('distDir') + '/', '');
        if (this.readConfig('gzippedFiles').indexOf(relativeMapFilePath) !== -1) {
          // When the source map is gzipped, we need to eagerly load it into a buffer
          // so that the actual content length is known.
          return {
            value: zlib.unzipSync(fs.readFileSync(mapFilePath)),
            options: {
              filename: path.basename(mapFilePath),
            }
          };
        } else {
          return fs.createReadStream(mapFilePath);
        }
      }
    });

    return new DeployPlugin();
  },
};

function fetchJSMapPairs(distFiles, publicUrl, distUrl) {
  var jsFiles = indexByBaseFilename(fetchFilePaths(distFiles, '', 'js'));
  return fetchFilePaths(distFiles, '', 'map').map(function(mapFile) {
    return {
      mapFile: distUrl + mapFile,
      jsFile: publicUrl + jsFiles[getBaseFilename(mapFile)]
    };
  });
}

function indexByBaseFilename(files) {
  return files.reduce(function(result, file) {
    result[getBaseFilename(file)] = file;
    return result;
  }, {});
}

function getBaseFilename(file) {
  return file.replace(/-[0-9a-f]+\.(js|map)$/, '');
}

function fetchFilePaths(distFiles, basePath, type) {
  return distFiles.filter(function(filePath) {
    return new RegExp('assets/.*\\.' + type + '$').test(filePath);
  })
  .map(function(filePath) {
    return basePath + '/' + filePath;
  });
}
