scout.Button = function() {
  scout.Button.parent.call(this);
};
scout.inherits(scout.Button, scout.FormField);

// TODO AWE/CGU: (scout) refactor when system-types are moved to IAction (also used for Menus)
scout.Button.SYSTEM_TYPE = {
  NONE: 0,
  CANCEL: 1,
  CLOSE: 2,
  OK: 3,
  RESET: 4,
  SAVE: 5,
  SAVE_WITHOUT_MARKER_CHANGE: 6
};

/**
 * The button form-field has no label and no status. Additionally it also has no container.
 * Container and field are the same thing.
 */
scout.Button.prototype._render = function($parent) {
  this.addContainer($parent, 'button', new scout.ButtonLayout());
  this.addField($('<button>').
    on('click', function() {
      this.session.send(this.id, 'clicked');
    }.bind(this)));
};

scout.Button.prototype._renderLabel = function(label) {
  if (!label) {
    label = '';
  } else {
    label = scout.strings.removeAmpersand(label);
  }
  this.$field.text(label);
};
