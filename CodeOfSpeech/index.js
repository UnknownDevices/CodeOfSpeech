/**
 * @param {import("zerespluginlibrary").Plugin} Plugin
 * @param {import("zerespluginlibrary").BoundAPI} Api
 */

module.exports = (Plugin, Api) => {
  const fs = require("fs");

  const {
    DiscordModules,
    DiscordSelectors,
    DiscordClasses,
    ContextMenu,
    Settings,
    Utilities,
    ReactTools,
    Logger,
    DOMTools,
    Patcher,
    WebpackModules,
  } = Api;

  const { UserStore, React } = DiscordModules;

  /**
   * Setting field to extend to create new settings
   * @memberof module:Settings
   */
  class SettingField extends Api.Structs.Listenable {
    /**
     * @param {string} name - name label of the setting
     * @param {string} note - help/note to show underneath or above the setting
     * @param {callable} onChange - callback to perform on setting change
     * @param {(ReactComponent|HTMLElement)} settingtype - actual setting to render
     * @param {object} [props] - object of props to give to the setting and the settingtype
     * @param {boolean} [props.noteOnTop=false] - determines if the note should be shown above the element or not.
     */
    constructor(name, note, onChange, settingtype, props = {}) {
      super();
      this.name = name;
      this.note = note;
      if (typeof onChange == "function") this.addListener(onChange);
      this.inputWrapper = DOMTools.parseHTML(
        `<div class="plugin-input-container"></div>`
      );
      this.type =
        typeof settingtype == "function"
          ? settingtype
          : ReactTools.wrapElement(settingtype);
      this.props = props;
      DOMTools.onAdded(this.getElement(), () => {
        this.onAdded();
      });
      DOMTools.onRemoved(this.getElement(), () => {
        this.onRemoved();
      });
    }

    /** @returns {HTMLElement} - root element for setting */
    getElement() {
      return this.inputWrapper;
    }

    /** Fires onchange to listeners */
    onChange() {
      this.alertListeners(...arguments);
    }

    /** Fired when root node added to DOM */
    onAdded() {
      const reactElement = DiscordModules.ReactDOM.render(
        DiscordModules.React.createElement(
          ReactSetting,
          Object.assign(
            {
              title: this.name,
              type: this.type,
              note: this.note,
            },
            this.props
          )
        ),
        this.getElement()
      );

      if (this.props.onChange)
        reactElement.props.onChange = this.props.onChange(reactElement);
      reactElement.forceUpdate();
    }

    /** Fired when root node removed from DOM */
    onRemoved() {
      DiscordModules.ReactDOM.unmountComponentAtNode(this.getElement());
    }
  }

  class ReactSetting extends DiscordModules.React.Component {
    get noteElement() {
      const className = this.props.noteOnTop
        ? DiscordClasses.Margins.marginBottom8
        : DiscordClasses.Margins.marginTop8;
      return DiscordModules.React.createElement(DiscordModules.SettingsNote, {
        children: this.props.note,
        type: "description",
        className: className.toString(),
      });
    }

    get dividerElement() {
      return DiscordModules.React.createElement("div", {
        className: DiscordClasses.Dividers.divider
          .add(DiscordClasses.Margins.marginTop20)
          .toString(),
      });
    }

    render() {
      const ce = DiscordModules.React.createElement;
      const SettingElement = ce(this.props.type, this.props);
      if (this.props.inline) {
        const Flex = DiscordModules.FlexChild;
        const titleDefault = WebpackModules.getByProps("titleDefault")
          ? WebpackModules.getByProps("titleDefault").title
          : "titleDefault-a8-ZSr title-31JmR4";
        return ce(
          Flex,
          {
            direction: Flex.Direction.VERTICAL,
            className: DiscordClasses.Margins.marginTop20.toString(),
          },
          ce(
            Flex,
            { align: Flex.Align.START },
            ce(
              Flex.Child,
              { wrap: !0 },
              ce("div", { className: titleDefault }, this.props.title)
            ),
            ce(Flex.Child, { grow: 0, shrink: 0 }, SettingElement)
          ),
          this.noteElement,
          this.dividerElement
        );
      }

      return ce(DiscordModules.SettingsWrapper, {
        className: DiscordClasses.Margins.marginTop20.toString(),
        title: this.props.title,
        children: [
          this.props.noteOnTop ? this.noteElement : SettingElement,
          this.props.noteOnTop ? SettingElement : this.noteElement,
          this.dividerElement,
        ],
      });
    }
  }

  class CloseButton extends React.Component {
    render() {
      const size = this.props.size || "14px";
      return React.createElement(
        "svg",
        {
          className: this.props.className || "",
          fill: "currentColor",
          viewBox: "0 0 24 24",
          style: { width: size, height: size },
          onClick: this.props.onClick,
        },
        React.createElement("path", {
          d: "M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z",
        })
      );
    }
  }

  class DownArrow extends React.Component {
    render() {
      const size = this.props.size || "16px";
      return React.createElement(
        "svg",
        {
          className: this.props.className || "",
          fill: "currentColor",
          viewBox: "0 0 24 24",
          style: { width: size, height: size },
          onClick: this.props.onClick,
        },
        React.createElement("path", {
          d: "M8.12 9.29L12 13.17l3.88-3.88c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-4.59 4.59c-.39.39-1.02.39-1.41 0L6.7 10.7c-.39-.39-.39-1.02 0-1.41.39-.38 1.03-.39 1.42 0z",
        })
      );
    }
  }

  // <svg class="closeIcon-11LhXr" aria-hidden="false" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z"></path></svg>

  class Select extends React.Component {
    constructor(props) {
      super(props);
      this.state = { open: false, value: this.props.value };
      this.dropdown = React.createRef();
      this.onChange = this.onChange.bind(this);
      this.showMenu = this.showMenu.bind(this);
      this.hideMenu = this.hideMenu.bind(this);
      this.clear = this.clear.bind(this);
    }

    showMenu(event) {
      event.preventDefault();
      event.stopPropagation();

      this.setState(
        (state) => ({ open: !state.open }),
        () => {
          if (!this.state.open) return;

          document.addEventListener("click", this.hideMenu);
        }
      );
    }

    hideMenu() {
      this.setState({ open: false }, () => {
        document.removeEventListener("click", this.hideMenu);
      });
    }

    onChange(value) {
      this.setState({ value });
      if (this.props.onChange) this.props.onChange(value);
    }

    get selected() {
      return this.props.options.find((o) => o.value == this.state.value);
    }

    get options() {
      const selected = this.selected;
      return React.createElement(
        "div",
        { className: "z-select-options" },
        this.props.options.map((opt) => {
          return React.createElement(
            "div",
            {
              className: `z-select-option${
                selected?.value == opt.value ? " selected" : ""
              }${opt.disabled ? " disabled--8Sav3" : ""}`,
              onClick: this.onChange.bind(this, opt.value),
            },
            opt.label
          );
        })
      );
    }

    clear(event) {
      event.stopPropagation();
      this.onChange(null);
    }

    render() {
      const style =
        this.props.style == "transparent" ? " z-select-transparent" : "";
      const isOpen = this.state.open ? " menu-open" : "";
      const selected = this.selected;
      return React.createElement(
        "div",
        {
          className: `z-select${style}${isOpen}`,
          ref: this.dropdown,
          onClick: this.showMenu,
        },
        [
          React.createElement(
            "div",
            {
              className: `z-select-value${
                selected.disabled ? " disabled--8Sav3" : ""
              }`,
            },
            selected?.label ?? this.props.placeholder
          ),
          React.createElement(
            "div",
            { className: "z-select-icons" },
            this.props.clearable &&
              selected &&
              React.createElement(CloseButton, {
                className: "z-select-clear",
                onClick: this.clear,
              }),
            React.createElement(DownArrow, { className: "z-select-arrow" })
          ),
          this.state.open && this.options,
        ]
      );
    }
  }

  /**
   * Creates a dropdown using discord's built in dropdown.
   * @memberof module:Settings
   * @extends module:Settings.SettingField
   */
  class Dropdown extends SettingField {
    /**
     * @param {string} name - name label of the setting
     * @param {string} note - help/note to show underneath or above the setting
     * @param {*} defaultValue - currently selected value
     * @param {Array<module:Settings~DropdownItem>} values - array of all options available
     * @param {callable} onChange - callback to perform on setting change, callback item value
     * @param {object} [options] - object of options to give to the setting
     * @param {boolean} [options.clearable=false] - should be able to empty the field value
     * @param {string} [options.placeholder=""] - Placeholder to show when no option is selected, useful when clearable
     * @param {boolean} [options.disabled=false] - should the setting be disabled
     */
    constructor(name, note, defaultValue, values, onChange, options = {}) {
      const { clearable = false, disabled = false, placeholder = "" } = options;
      super(name, note, onChange, Select, {
        placeholder: placeholder,
        clearable: clearable,
        disabled: disabled,
        options: values,
        onChange: (dropdown) => (value) => {
          dropdown.props.value = value;
          dropdown.forceUpdate();
          this.onChange(value);
        },
        value: defaultValue,
      });
    }
  }

  return class CodeOfSpeech extends Plugin {
    constructor(meta) {
      super();
      this.meta = meta;
    }

    loadSettings() {
      Object.assign(
        this,
        Utilities.loadSettings(this.meta.name, {
          defaultCodeSelection: { option: 1 },
          codeViolationMsg: "Code Violation - ${rule}",
        })
      );
    }

    // TODO: force reload when selected code is changed
    getSettingsPanel() {
      const elems = [];

      {
        const current = this.defaultCodeSelection;

        const values = [];
        for (const codesKey in this.codes) {
          values.push({
            label: "● " + codesKey,
            value: { option: 2, id: codesKey },
          });
        }
        values.push({ label: "None", value: { option: 1 } });

        let defaultValue = values.find(
          (value) =>
            value.value.option === current.option &&
            value.value.id === current.id
        )?.value;

        if (defaultValue == null) {
          const value = {
            label: current.option === 1 ? "None" : "● " + current.id,
            disabled: true,
            value: { option: 2, id: this.resolveCodeSelectionId(current) },
          };
          values.unshift(value);
          defaultValue = value.value;
        }

        elems.push(
          new Dropdown(
            "Default Code",
            "The code to be used by default on all channels.",
            defaultValue, // TODO: properly handle null
            values,
            (value) => {
              const data = Utilities.loadSettings(this.meta.name, {});
              data.defaultCodeSelection = this.defaultCodeSelection = value;
              Utilities.saveSettings(this.meta.name, data);
            }
          ).getElement()
        );
      }

      {
        const curr = this.codeViolationMsg;
        elems.push(
          new Settings.Textbox(
            "Code Violation Message",
            `The message to display on a toast when a code is violated.`,
            curr,
            (value) => {
              const data = Utilities.loadSettings(this.meta.name, {});
              data.codeViolationMsg = this.codeViolationMsg = value;
              Utilities.saveSettings(this.meta.name, data);
            }
          ).getElement()
        );
      }

      return new Settings.SettingPanel(null, ...elems).getElement();
    }

    insertBeforeReactTreeElem(elem, match, buildElems, maxDepth) {
      function inner(elem, match, buildElems, maxDepth, currDepth) {
        const children = Array.isArray(elem) ? elem : elem?.props?.children;

        if (!children) return false;

        if (Array.isArray(children)) {
          for (let i = 0; i < children.length; i++) {
            if (match(children[i])) {
              children.splice(i, 0, buildElems());
              return true;
            }
          }

          if (currDepth < maxDepth) {
            for (let child of children) {
              if (inner(child, match, buildElems, maxDepth, currDepth + 1))
                return true;
            }

            return inner(children, match, buildElems, maxDepth, currDepth + 1);
          }
        } else {
          if (match(children)) {
            elem.props.children = [buildElems(), elem.props.children];
            return true;
          }

          if (currDepth < maxDepth) {
            return inner(children, match, buildElems, maxDepth, currDepth + 1);
          }
        }

        return false;
      }

      return inner(elem, match, buildElems, maxDepth, 0);
    }

    loadCodeSelection(userId, contextId, contextTy) {
      return (
        Utilities.loadData(this.meta.name, userId, {})[contextTy]?.[contextId]
          ?.selectedCode ?? { option: 0 }
      );
    }

    saveCodeSelection(userId, contextId, contextTy, code) {
      const data = Utilities.loadData(this.meta.name, userId, {});

      if (!data[contextTy]) data[contextTy] = {};
      if (!data[contextTy][contextId]) data[contextTy][contextId] = {};
      data[contextTy][contextId].selectedCode = data[contextTy][
        contextId
      ].selectedCode = code;

      Utilities.saveData(this.meta.name, userId, data);
    }

    resolveCodeSelection(codeSelection, userId, parentId, guildId) {
      let resolvedCodeSelection = codeSelection;
      if (parentId && resolvedCodeSelection.option === 0) {
        resolvedCodeSelection = this.loadCodeSelection(
          userId,
          parentId,
          "channels"
        );
      }
      if (guildId && resolvedCodeSelection.option === 0) {
        resolvedCodeSelection = this.loadCodeSelection(
          userId,
          guildId,
          "guilds"
        );
      }
      if (resolvedCodeSelection.option === 0) {
        resolvedCodeSelection = this.defaultCodeSelection;
      }

      return resolvedCodeSelection;
    }

    refreshCodes() {
      fs.readFile(
        `${process.env.APPDATA}/BetterDiscord/plugins/${this.meta.name}.config.json`,
        "utf8",
        (err, data) => {
          if (err) {
            Logger.err(`While refreshing codes: ${err}`);
            return;
          }

          data = JSON.parse(data);
          this.loadCodes(data.codes);
          Utilities.saveData(this.meta.name, "codes", data.codes);
        }
      );
    }

    buildCodeOfSpeechMenuItem(context, contextTy) {
      const currUserId = UserStore.getCurrentUser()?.id;
      const codeSelection = this.loadCodeSelection(
        currUserId,
        context.id,
        contextTy
      );

      let defaultCodeSelection = this.resolveCodeSelection(
        { option: 0 },
        currUserId,
        context.parent_id,
        context.guild_id
      );

      let defaultCodeSelectionlabel;
      switch (context.parent_id ? 0 : context.guild_id ? 1 : 2) {
        case 0: {
          defaultCodeSelectionlabel = "Use Category Default";
          break;
        }
        case 1: {
          defaultCodeSelectionlabel = "Use Server Default";
          break;
        }
        case 2: {
          defaultCodeSelectionlabel = "Use Default";
          break;
        }
        default:
          // TODO: throw or something idk
          break;
      }

      let codeEnablersGroup = {
        type: "group",
        items: [],
      };

      codeEnablersGroup.items.push({
        type: "radio",
        label: defaultCodeSelectionlabel,
        subtext:
          defaultCodeSelection.option === 1
            ? "None"
            : "● " + defaultCodeSelection.id,
        checked: codeSelection.option === 0,
        action: () => {
          this.saveCodeSelection(currUserId, context.id, contextTy, {
            option: 0,
          });
          ContextMenu.forceUpdateMenus();
        },
      });

      if (codeSelection.option === 2 && !this.codes[codeSelection.id]) {
        codeEnablersGroup.items.push({
          type: "radio",
          label: "● " + codeSelection.id,
          checked: true,
          disabled: true,
          action: () => {},
        });
      } else if (
        defaultCodeSelection.option === 2 &&
        !this.codes[defaultCodeSelection.id]
      ) {
        codeEnablersGroup.items.push({
          type: "radio",
          label: "● " + this.defaultCodeSelection.id,
          checked: false,
          disabled: true,
          action: () => {},
        });
      }

      for (const codesKey in this.codes) {
        codeEnablersGroup.items.push({
          type: "radio",
          label: "● " + codesKey,
          checked: codeSelection.option === 2 && codeSelection.id === codesKey,
          action: () => {
            this.saveCodeSelection(currUserId, context.id, contextTy, {
              option: 2,
              id: codesKey,
            });
            ContextMenu.forceUpdateMenus();
          },
        });
      }

      codeEnablersGroup.items.push({
        type: "radio",
        label: "None",
        checked: codeSelection.option === 1,
        action: () => {
          this.saveCodeSelection(currUserId, context.id, contextTy, {
            option: 1,
          });
          ContextMenu.forceUpdateMenus();
        },
      });

      const actionsGroup = {
        type: "group",
        items: [
          {
            type: "text",
            label: "Refresh Codes",
            action: this.refreshCodes.bind(this),
          },
        ],
      };

      return ContextMenu.buildMenuChildren([
        {
          type: "group",
          id: "code-of-speech",
          items: [
            {
              type: "submenu",
              label: "Code of Speech",
              children: ContextMenu.buildMenuChildren([
                codeEnablersGroup,
                actionsGroup,
              ]),
            },
          ],
        },
      ])[0];
    }

    // TODO: return true to call the origFunc, false otherwise
    // TODO: look into notice buttons, perhaps add a way to silence this warning
    HandleOnSubmit(instance, args, origFunc) {
      const [text, command] = args;

      // TODO: handle null
      const currUserId = UserStore.getCurrentUser()?.id;

      const codeSelectionId = this.resolveCodeSelection(
        this.loadCodeSelection(
          currUserId,
          instance.props.channel.id,
          "channels"
        ),
        currUserId,
        instance.props.channel.parent_id,
        instance.props.channel.guild_id
      ).id;

      if (command || codeSelectionId == null) return origFunc(...args);

      const code = this.codes[codeSelectionId];
      if (!code) {
        BdApi.UI.showNotice(
          `[Code of Speech] - The code selected for this channel is not currently loaded`,
          { type: "warning", timeout: 8000 }
        );

        return origFunc(...args);
      }

      let abortSubmit = false;
      for (const rulesKey in code.rules) {
        const rule = code.rules[rulesKey];
        if (!rule.apply(text)) {
          abortSubmit = true;
          const message = Utilities.formatTString(this.codeViolationMsg, {
            rule: rulesKey,
          });

          Api.Toasts.warning(message, {
            timeout: 5000,
          });
        }
      }

      if (!abortSubmit) return origFunc(...args);
    }

    patchTextArea(textArea) {
      const instance = ReactTools.getOwnerInstance(textArea);

      const patchedTextArea = {
        textArea,
      };

      patchedTextArea.unpatchRender = Patcher.before(
        instance,
        "render",
        (instance, _1, _2) => {
          patchedTextArea.unpatchOnSubmit?.();

          if (!instance?.props?.channel) return;

          patchedTextArea.unpatchOnSubmit = Patcher.instead(
            instance.props,
            "onSubmit",
            (_0, args, origFunc) => {
              return this.HandleOnSubmit(instance, args, origFunc);
            }
          );
        }
      );

      this.patchedTextAreas.push(patchedTextArea);
    }

    unpatchTextArea(textArea) {
      const index = this.patchedTextAreas.findIndex(
        (patchedTextArea) => patchedTextArea.textArea === textArea
      );

      if (index !== -1) {
        this.patchedTextAreas[index].unpatchRender?.();
        this.patchedTextAreas[index].unpatchOnSubmit?.();

        this.patchedTextAreas.splice(index, 1);
      }
    }

    // TODO: properly handle 'UserStore.getCurrentUser' returning null or undefined
    patchContextMenus() {
      this.contextMenuPatches = [
        BdApi.ContextMenu.patch("user-context", (menu, props) => {
          if (props.channelSelected == null || !props.channel?.id) return;

          this.insertBeforeReactTreeElem(
            menu,
            (elem) => {
              const target = elem?.props?.children?.props?.id;
              return target === "mute-channel" || target === "unmute-channel";
            },
            () => this.buildCodeOfSpeechMenuItem(props.channel, "channels"),
            5
          );
        }),

        BdApi.ContextMenu.patch("gdm-context", (menu, props) => {
          if (!props?.channel?.id) return;

          // NOTE: weird discord bug here: try moving your cursor between the change icon and mute conversation items, you should see the mute conversation item not always get selected when it should, the same thing happens to our item when we insert it here right after the change icon item
          this.insertBeforeReactTreeElem(
            menu,
            (elem) => {
              const target = elem?.props?.children?.props?.id;
              return target === "mute-channel" || target === "unmute-channel";
            },
            () => this.buildCodeOfSpeechMenuItem(props.channel, "channels"),
            5
          );
        }),

        BdApi.ContextMenu.patch("channel-context", (menu, props) => {
          if (
            !props?.channel?.id ||
            !(
              // GUILD_TEXT
              (
                props.channel.type === 0 ||
                // GUILD_CATEGORY
                props.channel.type === 4 ||
                // GUILD_ANNOUNCEMENT
                props.channel.type === 5
              )
            )
          )
            return;

          this.insertBeforeReactTreeElem(
            menu,
            (elem) => elem?.key === "notifications",
            () => this.buildCodeOfSpeechMenuItem(props.channel, "channels"),
            5
          );
        }),

        BdApi.ContextMenu.patch("thread-context", (menu, props) => {
          if (
            !props?.channel?.id ||
            !(
              // ANNOUNCEMENT_THREAD
              (
                props.channel.type === 10 ||
                // PUBLIC_THREAD
                props.channel.type === 11 ||
                // PRIVATE_THREAD
                props.channel.type === 12
              )
            )
          )
            return;

          this.insertBeforeReactTreeElem(
            menu,
            (elem) => elem?.key === "notifications",
            () => this.buildCodeOfSpeechMenuItem(props.channel, "channels"),
            5
          );
        }),

        BdApi.ContextMenu.patch("guild-context", (menu, props) => {
          if (!props?.guild?.id) return;

          this.insertBeforeReactTreeElem(
            menu,
            (elem) => {
              const target = elem?.props?.children?.[0]?.props?.id;
              return target === "mute-guild" || target === "unmute-guild";
            },
            () => this.buildCodeOfSpeechMenuItem(props.guild, "guilds"),
            5
          );
        }),
      ];
    }

    unpatchContextMenus() {
      if (!this.contextMenuPatches) return;

      for (const cancel of this.contextMenuPatches) cancel();
      this.contextMenuPatches = [];
    }

    observer(e) {
      if (e.addedNodes.length && e.addedNodes[0] instanceof Element) {
        const node = e.addedNodes[0];
        if (node.matches(DiscordSelectors.Textarea.textArea)) {
          this.patchTextArea(node);
        } else {
          for (const textArea of node.querySelectorAll(
            DiscordSelectors.Textarea.textArea
          )) {
            this.patchTextArea(textArea);
          }
        }
      } else if (
        e.removedNodes.length &&
        e.removedNodes[0] instanceof Element
      ) {
        const node = e.removedNodes[0];
        if (node.matches(DiscordSelectors.Textarea.textArea)) {
          this.unpatchTextArea(node);
        } else {
          for (const textArea of node.querySelectorAll(
            DiscordSelectors.Textarea.textArea
          )) {
            this.unpatchTextArea(textArea);
          }
        }
      }
    }

    combineRegStrs(regStrs) {
      let output = "";

      regStrs?.forEach?.((regStr) => {
        if (!regStr) return;
        output += `${regStr}|`;
      });

      if (output) {
        output = output.substring(0, output.length - 1);
      }

      return output;
    }

    escapeRegSpecialChars(regStr) {
      return regStr.replace(this.regExprs.regSpecialChars, "\\$&");
    }

    loadRuleTypes() {
      this.ruleTypes = {
        pattern: ({
          patterns,
          negate = false,
          regex = false,
          caseInsensitive = false,
          multiline = false,
          unicode = false,
          excludeUrls = false,
          excludeEmojis = false,
        }) => {
          if (!Array.isArray(patterns) || patterns.length <= 0)
            return "'patterns' must be a non-empty array";
          if (typeof negate !== "boolean") return "'negate' must be a boolean";
          if (typeof regex !== "boolean") return "'regex' must be a boolean";
          if (typeof caseInsensitive !== "boolean")
            return "'caseInsensitive' must be a boolean";
          if (typeof multiline !== "boolean")
            return "'multiline' must be a boolean";
          if (typeof unicode !== "boolean")
            return "'unicode' must be a boolean";
          if (typeof excludeUrls !== "boolean")
            return "'excludeUrls' must be a boolean";
          if (typeof excludeEmojis !== "boolean")
            return "'excludeEmojis' must be a boolean";

          let excludeRegStrs = [];
          if (excludeUrls) excludeRegStrs.push(this.regStrs.url);
          if (excludeEmojis)
            excludeRegStrs.push(
              this.regStrs.unicodeEmoji,
              this.regStrs.emojiId
            );

          const excludeRegExpr = new RegExp(
            this.combineRegStrs(excludeRegStrs),
            "gu"
          );

          if (!regex)
            patterns = patterns.map(this.escapeRegSpecialChars.bind(this));

          const matchRegExpr = new RegExp(
            this.combineRegStrs(patterns),
            "g" +
              (caseInsensitive ? "i" : "") +
              (multiline ? "m" : "") +
              (unicode ? "u" : "")
          );

          return {
            apply: (text) => {
              text = text.replace(excludeRegExpr, "");
              return (text.match(matchRegExpr) == null) ^ !negate;
            },
          };
        },

        word: ({
          words,
          negate = false,
          regex = false,
          caseInsensitive = true,
          multiline = false,
          unicode = false,
        }) => {
          if (!Array.isArray(words) && words.length <= 0)
            return "'words' must be a non-empty array";
          if (typeof negate !== "boolean") return "'negate' must be a boolean";
          if (typeof regex !== "boolean") return "'regex' must be a boolean";
          if (typeof caseInsensitive !== "boolean")
            return "'caseInsensitive' must be a boolean";
          if (typeof multiline !== "boolean")
            return "'multiline' must be a boolean";
          if (typeof unicode !== "boolean")
            return "'unicode' must be a boolean";

          const excludeRegExpr = new RegExp(
            this.combineRegStrs([
              this.regStrs.url,
              this.regStrs.unicodeEmoji,
              this.regStrs.emojiId,
            ]),
            "gu"
          );

          if (!regex) words = words.map(this.escapeRegSpecialChars.bind(this));

          const matchRegExpr = new RegExp(
            `(?<!\\w'?)(${this.combineRegStrs(words)})(?!\\w)`,
            "g" +
              (caseInsensitive ? "i" : "") +
              (multiline ? "m" : "") +
              (unicode ? "u" : "")
          );

          return {
            apply: (text) => {
              text = text.replace(excludeRegExpr, "");
              return (text.match(matchRegExpr) == null) ^ !negate;
            },
          };
        },

        wordFrequency: ({
          words,
          every,
          negate = false,
          excludeTextsUnder = 1,
          regex = false,
          caseInsensitive = true,
          multiline = false,
          unicode = false,
        }) => {
          // TODO: assert type with function somehow
          if (!Array.isArray(words)) return "'words' must be a non-empty array";
          if (every == 0) return "'every' must be a non-zero number";
          if (typeof negate !== "boolean") return "'negate' must be a boolean";
          if (typeof excludeTextsUnder !== "number")
            return "'excludeTextsUnder' must be a number";
          if (typeof regex !== "boolean") return "'regex' must be a boolean";
          if (typeof caseInsensitive !== "boolean")
            return "'caseInsensitive' must be a boolean";

          const excludeRegExpr = new RegExp(
            this.combineRegStrs([
              this.regStrs.url,
              this.regStrs.unicodeEmoji,
              this.regStrs.emojiId,
            ]),
            "gu"
          );

          if (!regex) words = words.map(this.escapeRegSpecialChars.bind(this));

          const matchRegExpr = new RegExp(
            `(?<!\\w'?)(${this.combineRegStrs(words)})(?!\\w)`,
            "g" +
              (caseInsensitive ? "i" : "") +
              (multiline ? "m" : "") +
              (unicode ? "u" : "")
          );

          return {
            apply: (text) => {
              text = text.replace(excludeRegExpr, "");
              const matches = text.match(matchRegExpr) || [];
              const remainingWords =
                text.replace(matchRegExpr, "")?.match(this.regExprs.word) || [];

              const requiredMatches = Math.ceil(remainingWords.length / every);

              return (
                (excludeTextsUnder <= remainingWords.length &&
                  matches.length < requiredMatches) ^ !negate
              );
            },
          };
        },

        syllableCount: ({
          min = -1,
          max = Number.MAX_VALUE,
          negate = false,
        }) => {
          if (typeof min !== "number") return "'min' must be a number";
          if (typeof max !== "number") return "'max' must be a number";
          if (typeof negate !== "boolean") return "'negate' must be a boolean";

          const excludeRegExpr = new RegExp(
            this.combineRegStrs([this.regStrs.url, this.regStrs.emojiId]),
            "gu"
          );

          return {
            apply: (text) => {
              text = text.replace(excludeRegExpr, "");
              const words = text.match(this.regExprs.word) || [];

              // TODO: always count the syllables of all words

              for (let word of words) {
                word = word.toLowerCase();
                word = word.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, "");
                word = word.replace(/^y/, "");

                const syllablesCount = word.match(/[aeiouy]{1,2}/g)?.length;
                if ((syllablesCount <= min || max < syllablesCount) ^ negate) {
                  return false;
                }
              }

              return true;
            },
          };
        },

        capitalizedWord: ({ negate = false, excludeFullCaps = false }) => {
          if (typeof negate !== "boolean") return "'negate' must be a boolean";
          if (typeof excludeFullCaps !== "boolean")
            return "'excludeFullCaps' must be a boolean";

          const excludeRegExpr = new RegExp(
            this.combineRegStrs([this.regStrs.url, this.regStrs.emojiId]),
            "gu"
          );

          const matchRegExpr = excludeFullCaps
            ? this.regExprs.notFullCapsCapitalizedWord
            : this.regExprs.capitalizedWord;

          return {
            apply: (text) => {
              text = text.replace(excludeRegExpr, "");
              return (text.match(matchRegExpr) == null) ^ !negate;
            },
          };
        },
      };
    }

    loadCodes(codesData) {
      this.codes = {};

      for (const codesDataKey in codesData) {
        if (!codesDataKey.match(this.regExprs.validCodeName)) {
          Logger.err(
            `While loading '${codesDataKey}' code: the name for the code can only contain alphanumerics, underscores, dashes, apostrophes, and spaces, it must not begin nor end with a space, and it must be no longer than 20 characters`
          );
          continue;
        }

        const codeData = codesData[codesDataKey];

        if (
          codeData.description != null &&
          typeof codeData.description !== "string"
        ) {
          Logger.err(
            `While loading '${codesDataKey}' code: 'description' must be string`
          );
          continue;
        }
        if (typeof codeData.rules !== "object") {
          Logger.err(
            `While loading '${codesDataKey}' code: 'rules' be an object`
          );
          continue;
        }

        this.codes[codesDataKey] = {
          description: codeData.description ?? "",
          rules: {},
        };

        for (const rulesDataKey in codeData.rules) {
          if (!rulesDataKey.match(this.regExprs.validRuleName)) {
            Logger.err(
              `While loading '${codesDataKey}' code: the name for the code can only contain alphanumerics, underscores, dashes, apostrophes, and spaces, it must not begin nor end with a space, and it must be no longer than 40 characters`
            );
            continue;
          }

          const ruleData = codeData.rules[rulesDataKey];

          if (
            typeof ruleData.type !== "string" ||
            !this.ruleTypes[ruleData.type]
          ) {
            Logger.err(
              `While loading '${rulesDataKey}' rule of '${codesDataKey}' code: type must be a string representing a valid rule type`
            );
            continue;
          }

          const rule = this.ruleTypes[ruleData.type](ruleData);
          if (typeof rule === "string") {
            Logger.err(
              `While loading '${rulesDataKey}' rule of '${codesDataKey}' code: ${rule}`
            );
            continue;
          }

          this.codes[codesDataKey].rules[rulesDataKey] = rule;
        }
      }

      Logger.info("Done loading codes");
    }

    loadReg() {
      this.regStrs = {
        url: "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
        unicodeEmoji:
          "(\\p{Extended_Pictographic}\\u{200D})*\\p{Extended_Pictographic}\\u{FE0F}?",
        emojiId: "<a?:[\\w~]{2,}:\\d{18}>",
      };

      this.regExprs = {
        notFullCapsCapitalizedWord:
          /(?<!\w'?)[A-Z](?!'?[A-Z\d_]+(\W|$))(\w)*('\w+)?/g,
        capitalizedWord: /(?<!\w'?)[A-Z]\w*('\w+)?/g,
        word: /(?<!\w'?)\w+('\w+)?/g,
        regSpecialChars: /[.*+?^${}()|[\]\\]/g,
        validCodeName: /^(?! )[\w-' ]{0,20}(?<! )$/,
        validRuleName: /^(?! )[\w-' ]{0,40}(?<! )$/,
      };
    }

    // TODO: customizable code violation toast timeout
    // TODO: custom exclude for empty messages
    // TODO: enumerate rules
    // TODO: exclude code blocks
    // TODO: consider filtering out noises where relevant
    // TODO: consider an auto correct method on rules where relevant
    // TODO: look into LoadMessages
    // TODO: enforce length of code names and rule names, also enforece only using alphanumeric values and spaces
    // TODO: exclude RPNonDialogue and exclude vocalizations
    // TODO: display a toast or something when the codes are refreshed
    // TODO: display notice when a rule or code fails to load

    onStart() {
      this.loadReg();
      this.loadSettings();
      this.loadRuleTypes();
      this.loadCodes(Utilities.loadData(this.meta.name, "codes", {}));

      this.patchedTextAreas = [];
      for (const elem of document.querySelectorAll(
        DiscordSelectors.Textarea.textArea
      )) {
        this.patchTextArea(elem);
      }

      this.patchContextMenus();
    }

    onStop() {
      Patcher.unpatchAll();
      this.unpatchContextMenus();
    }
  };
};
