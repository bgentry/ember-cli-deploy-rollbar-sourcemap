/*jshint globalstrict: true*/
'use strict';

var assert  = require('ember-cli/tests/helpers/assert');

describe('rollbar plugin', function() {
  var subject;

  beforeEach(function() {
    subject = require('../../index');
  });

  it('has a name', function() {
    var plugin = subject.createDeployPlugin({
      name: 'test-plugin'
    });

    assert.equal(plugin.name, 'test-plugin');
  });

  it('implements the correct hooks', function() {
    var plugin = subject.createDeployPlugin({
      name: 'test-plugin'
    });

    assert.equal(typeof plugin.willUpload, 'function');
    assert.equal(typeof plugin.upload, 'function');
  });

  it('implements the correct contentFor func', function() {
    var headContent = subject.contentFor('head');

    assert.equal(headContent, '<meta name="rollbar"/>');
  });
});
