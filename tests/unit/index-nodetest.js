import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import subject from "../../index";

module('Unit | Honeybadger plugin', function(hooks) {
  setupTest(hooks);

  test('has a name', function(assert) {
    var plugin = subject.createDeployPlugin({
      name: 'test-plugin'
    });

    assert.equal(plugin.name, 'test-plugin');
  });

  test('implements the correct hooks', function(assert) {
    var plugin = subject.createDeployPlugin({
      name: 'test-plugin'
    });

    assert.equal(typeof plugin.willUpload, 'function');
    assert.equal(typeof plugin.upload, 'function');
  });

  test('implements the correct contentFor func', function(assert) {
    var headContent = subject.contentFor('head');

    assert.equal(headContent, '<meta name="honeybadger"/>');
  });
});
