/* jshint node: true */
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
        rollbarConfig: {
          enabled: true,
          environment: 'production',
          captureUncaught: true
        },
        integrateRollbar: true
      },
      requiredConfig: ['accessToken', 'accessServerToken', 'minifedPrependUrl'],

      willUpload: function(context) {
        if(this.readConfig('integrateRollbar')) {
          // setup rollbarConfig
          var rollbarConfig = {
            accessToken: this.readConfig('accessToken'),
            enabled: this.readConfig('rollbarConfig').enabled,
            captureUncaught: this.readConfig('rollbarConfig').captureUncaught,
            environment: this.readConfig('rollbarConfig').environment,
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

          // render rollbar snippet with fulfilled config
          var htmlSnippetPath = path.join(__dirname, 'addon', 'rollbar.html');
          var htmlContent = fs.readFileSync(htmlSnippetPath, 'utf-8');
          var snippetPath = path.join(__dirname, 'addon', 'snippet.js');
          var snippetContent = fs.readFileSync(snippetPath, 'utf-8');

          var rollbarSnippet = template(htmlContent)({
            rollbarConfig: JSON.stringify(rollbarConfig),
            rollbarSnippet: snippetContent
          });

          // replace rollbar metatag with rollbar snippet in index.html
          var indexPath = path.join(context.distDir, "index.html");
          var index = fs.readFileSync(indexPath, 'utf8');
          var index = index.replace('<meta name="rollbar"/>', rollbarSnippet);
          fs.writeFileSync(indexPath, index);
        }
      },
    });

    return new DeployPlugin();
  },

  contentFor: function(type) {
    if (type === 'head') {
      return '<meta name="rollbar"/>';
    }
  }
};
