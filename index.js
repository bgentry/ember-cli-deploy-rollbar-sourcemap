'use strict';

var RSVP = require('rsvp');
var fs = require('fs');
var path = require('path');
var minimatch = require('minimatch');
var FormData = require('form-data');

var BasePlugin = require('ember-cli-deploy-plugin');

module.exports = {
  name: 'ember-cli-deploy-rollbar',

  createDeployPlugin: function(options) {
    var DeployPlugin = BasePlugin.extend({
      name: options.name,

      defaultConfig: Object.freeze({
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
        additionalFiles: [],
      }),
      requiredConfig: Object.freeze(['accessToken', 'accessServerToken', 'minifiedPrependUrl']),

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
      }
    });

    return new DeployPlugin();
  },
};
