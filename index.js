'use strict';

var RSVP = require('rsvp');
var fs = require('fs');
var path = require('path');
var merge = require('lodash/object/merge');
var template = require('lodash/string/template');
var minimatch = require('minimatch');
var FormData = require('form-data');

var BasePlugin = require('ember-cli-deploy-plugin');

module.exports = {
  name: 'ember-cli-deploy-rollbar',

  createDeployPlugin: function(options) {
    var DeployPlugin = BasePlugin.extend({
      name: options.name,

      defaultConfig: {
        projectName: function(context) {
          return context.project.pkg.name;
        },
        revisionKey: function(context) {
          return context.revisionData && context.revisionData.revisionKey;
        },
        distFiles: function(context) {
          return context.distFiles;
        },
        distDir: function(context) {
          return context.distDir;
        },
        environment: function(context) {
          var rollbarConfig = context.config.rollbar.rollbarConfig;
          var buildConfig = context.config.build;
          var environment = rollbarConfig ? rollbarConfig.environment : false;
          return environment || buildConfig.environment || 'production';
        },
        enabled: function(context) {
          var rollbarConfig = context.config.rollbar.rollbarConfig;
          var enabled = rollbarConfig ? rollbarConfig.enabled : true;
          return !(enabled === false);
        },
        captureUncaught: function(context) {
          var rollbarConfig = context.config.rollbar.rollbarConfig;
          var captureUncaught = rollbarConfig ? rollbarConfig.captureUncaught : true;
          return !(captureUncaught === false);
        },
        integrateRollbar: true,
        additionalFiles: [],
        rollbarFileURI: 'https://d37gvrvc0wt4s1.cloudfront.net/js/v1.9/rollbar.min.js'
      },
      requiredConfig: ['accessToken', 'accessServerToken', 'minifiedPrependUrl'],

      willUpload: function(context) {
        if(this.readConfig('integrateRollbar')) {
          // setup rollbarConfig
          var rollbarConfig = {
            accessToken: this.readConfig('accessToken'),
            enabled: this.readConfig('enabled'),
            captureUncaught: this.readConfig('captureUncaught'),
            environment: this.readConfig('environment'),
            payload: {
              client: {
                javascript: {
                  source_map_enabled: true,
                  code_version: this.readConfig('revisionKey'),
                  guess_uncaught_frames: true
                }
              }
            }
          };

          var rollbarFileURI = this.readConfig('rollbarFileURI');

          // render rollbar snippet with fulfilled config
          var htmlSnippetPath = path.join(__dirname, 'addon', 'rollbar.html');
          var htmlContent = fs.readFileSync(htmlSnippetPath, 'utf-8');
          var snippetPath = path.join(__dirname, 'addon', 'snippet.js');
          var snippetContent = fs.readFileSync(snippetPath, 'utf-8');
          snippetContent = snippetContent.replace('ROLLBAR_JSFILE_URI', rollbarFileURI);

          var rollbarSnippet = template(htmlContent)({
            rollbarConfig: JSON.stringify(rollbarConfig),
            rollbarSnippet: snippetContent
          });

          // replace rollbar metatag with rollbar snippet in index.html
          var indexPath = path.join(context.distDir, "index.html");
          var index = fs.readFileSync(indexPath, 'utf8');
          index = index.replace('<meta name="rollbar"/>', rollbarSnippet);
          fs.writeFileSync(indexPath, index);
        }
      },

      upload: function(context) {
        var distFiles = this.readConfig('distFiles');
        var projectName = this.readConfig('projectName');
        var additionalFiles = this.readConfig('additionalFiles');

        var filePattern = projectName + ',vendor';

        if(additionalFiles.length) {
          filePattern += ',' + additionalFiles.join(',');
        }

        // fetch vendor and project-specific js and map
        var projectFileJs = distFiles.filter(minimatch.filter('**/{' + filePattern + '}*.js', {
          matchBase: true
        }));
        var projectFileMap = distFiles.filter(minimatch.filter('**/{' + filePattern + '}*.map', {
          matchBase: true
        }));

        var promiseArray = [];
        var accessServerToken = this.readConfig('accessServerToken');
        var revisionKey = this.readConfig('revisionKey');

        for(var i = 0; i < projectFileJs.length; i++) {
          // upload map to Rollbar using form-data

          var mapFilePath = path.join(this.readConfig('distDir'), projectFileMap[i]);
          var minifiedPrependUrl = this.readConfig('minifiedPrependUrl');
          if (typeof minifiedPrependUrl === 'function') {
            minifiedPrependUrl = minifiedPrependUrl(context);
          }
          [].concat(minifiedPrependUrl).forEach(function(url) {
            var formData = new FormData();
            formData.append('access_token', accessServerToken);
            formData.append('version', revisionKey);
            formData.append('minified_url', url + projectFileJs[i]);
            var fileSize = fs.statSync(mapFilePath)['size'];
            formData.append(
              'source_map',
              fs.createReadStream(mapFilePath),
              { knownLength: fileSize }
            );
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
          });
        };
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
      }
    });

    return new DeployPlugin();
  },

  contentFor: function(type) {
    if (type === 'head') {
      return '<meta name="rollbar"/>';
    }
  }
};
