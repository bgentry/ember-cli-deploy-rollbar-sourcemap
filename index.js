'use strict';

var RSVP = require('rsvp');
var fs = require('fs');
var path = require('path');
var request = require('request-promise');
var zlib = require('zlib');

var BasePlugin = require('ember-cli-deploy-plugin');

module.exports = {
  name: 'ember-cli-deploy-honeybadger-sourcemap',

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
          var HoneybadgerConfig = context.config["honeybadger-sourcemap"].honeybadgerConfig;
          var buildConfig = context.config.build;
          var environment = HoneybadgerConfig ? HoneybadgerConfig.environment : false;
          return environment || buildConfig.environment || 'production';
        },
        additionalFiles: [],
      }),
      requiredConfig: Object.freeze(['apiKey', 'publicUrl']),

      upload: function() {
        var log = this.log.bind(this);
        var distDir = this.readConfig('distDir');
        var distFiles = this.readConfig('distFiles');
        var apiKey = this.readConfig('apiKey');
        var revisionKey = this.readConfig('revisionKey');

        log('Uploading sourcemaps to Honeybadger', { verbose: true });

        var publicUrl = this.readConfig('publicUrl');

        var promiseArray = [];
        var jsMapPairs = fetchJSMapPairs(distFiles, publicUrl, distDir);

        for (var i = 0; i < jsMapPairs.length; i++) {
          var mapFilePath = jsMapPairs[i].mapFile;
          var jsUrl = jsMapPairs[i].jsFile;
          var minifiedFilePath = jsMapPairs[i].minifiedFile;

          var formData = {
            api_key: apiKey,
            minified_url: jsUrl,
            source_map: this._readSourceMap(mapFilePath),
            revision: revisionKey,
            minified_file: this._readSourceMap(minifiedFilePath),
          };

          log(`Uploading sourcemap to Honeybadger: version=${revisionKey} minified_url=${jsUrl}`, { verbose: true });
          var promise = request({
            uri: 'https://api.honeybadger.io/v1/source_maps',
            method: 'POST',
            formData: formData
          });
          promiseArray.push(promise);
        }

        return RSVP.all(promiseArray)
          .then(function() {
            log('Finished uploading sourcemaps', { verbose: true });
          });
      },

      didDeploy: function(context) {
        var didDeployHook = this.readConfig('didDeploy');

        if (didDeployHook) {
          return didDeployHook.call(this, context);
        }

        var apiKey = this.readConfig('apiKey');
        var environment = this.readConfig('environment');
        var revision = this.readConfig('revisionKey');
        var username = this.readConfig('username');

        var formData = {
          api_key: apiKey,
          "deploy[environment]": environment,
          "deploy[revision]": revision,
        };

        if (username) {
          formData.local_username = username;
        }

        return request({
          uri: 'https://api.honeybadger.io/v1/deploys',
          method: 'POST',
          formData: formData
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

function fetchJSMapPairs(distFiles, publicUrl, deployDistPath) {
  var jsFiles = indexByBaseFilename(fetchFilePaths(distFiles, '', 'js'));

  return fetchFilePaths(distFiles, '', 'map').map(function(mapFile) {
    var baseFileName = mapFile.replace(/\.map$/, '');

    return {
      mapFile: deployDistPath + mapFile,
      jsFile: publicUrl + jsFiles[baseFileName],
      minifiedFile: deployDistPath + jsFiles[baseFileName],
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
  return file.replace(/(-[0-9a-f]+)?\.(js|map)$/, '');
}

function fetchFilePaths(distFiles, basePath, type) {
  return distFiles.filter(function(filePath) {
    return new RegExp('assets/.*\\.' + type + '$').test(filePath);
  })
  .map(function(filePath) {
    return basePath + '/' + filePath;
  });
}
