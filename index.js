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
    });

    return new DeployPlugin();
  },

  contentFor: function(type) {
    if (type === 'head') {
      return '<meta name="rollbar"/>';
    }
  }
};
