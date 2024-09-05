/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {
  arrays, CalendarResourceLookupCall, HtmlComponent, InitModelOf, LookupRow, ObjectOrModel, ResourcePanelTreeNode, scout, SingleLayout, StaticTooltip, tooltips, Tree, TreeBox, TreeBoxTreeNode, TreeNode, TreeNodesCheckedEvent, Widget
} from '../index';

export class ResourcePanel extends Widget {
  treeBox: ResourcePanelTreeBox;
  tooltipSupport: StaticTooltip;

  protected override _init(model: InitModelOf<this>) {
    super._init(model);

    this.treeBox = scout.create(ResourcePanelTreeBox, {
      parent: this,
      lookupCall: CalendarResourceLookupCall,
      labelVisible: false,
      statusVisible: false,
      tree: {
        objectType: ResourcePanelTree,
        checkable: true,
        textFilterEnabled: false,
        _scrollDirections: 'y',
        autoCheckChildren: true
      }
    });
  }

  protected override _render() {
    this.$container = this.$parent.appendDiv('resource-panel-container');
    this.htmlComp = HtmlComponent.install(this.$container, this.session);
    this.htmlComp.setLayout(new SingleLayout());
    this.treeBox.render();
  }
}

class ResourcePanelTreeBox extends TreeBox<string> {
  declare tree: ResourcePanelTree;
  declare lookupCall: CalendarResourceLookupCall;
  tooltipSupport: StaticTooltip;

  protected override _render() {
    super._render();
    this.removeMandatoryIndicator();
    this._installTooltipSupport();
  }

  protected override _remove() {
    super._remove();
    this.tooltipSupport.close();
  }

  protected override _renderFocused() {
    // NOP
  }

  protected _installTooltipSupport() {
    let model = {
      parent: this,
      text: '${textKey:ui.AtLeastOneCalendarHasToBeVisible}'
    };
    this.tooltipSupport = new StaticTooltip(model);
  }

  protected override _createNode(lookupRow: LookupRow<string>): TreeBoxTreeNode<string> {
    let node = super._createNode(lookupRow);
    node.expanded = true;
    return node;
  }

  protected override _onTreeNodesChecked(event: TreeNodesCheckedEvent) {
    this._closeTooltip();
    // Make impossible to uncheck all nodes
    if (arrays.hasElements(this.tree.checkedNodes)) {
      super._onTreeNodesChecked(event);
    } else if (!this._populating) {
      // Reapply the value to the tree
      this._syncValueToTree(this.value);
      this._createImpossibleToUncheckTooltip(event.nodes[0]);
    }
  }

  protected _createImpossibleToUncheckTooltip(node: TreeNode) {
    if (this.tooltipSupport) {
      // Clear possible ellipsis tooltip of the tree
      tooltips.find(this.tree.$data).forEach(tooltip => tooltip.destroy());
      this.tooltipSupport.open(node.$node.children('.tree-node-checkbox'));
    }
  }

  protected _closeTooltip() {
    if (this.tooltipSupport) {
      this.tooltipSupport.close();
    }
  }
}

class ResourcePanelTree extends Tree {
  declare nodes: ResourcePanelTreeNode[];

  override insertNode(node: ObjectOrModel<ResourcePanelTreeNode>, parentNode?: ResourcePanelTreeNode, index?: number) {
    super.insertNode(node, parentNode, index);
  }
}
