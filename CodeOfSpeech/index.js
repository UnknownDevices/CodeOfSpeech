/**
 * @param {import("zerespluginlibrary").Plugin} Plugin
 * @param {import("zerespluginlibrary").BoundAPI} Api
 */

module.exports = (Plugin, Api) => {
  const fs = require("fs");
  const request = require("request");

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

  const { Dispatcher, SelectedChannelStore, MessageStore, UserStore, React } =
    DiscordModules;
    
  class SettingField extends Api.Structs.Listenable {
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

  class Dropdown extends SettingField {
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
          codeViolationMsg: "[Code of Speech] - ${rule}",
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

      return new Settings.SettingPanel(
        null,
        ...elems,
      ).getElement();
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

    loadData(path, defaultValue) {
      let [key, ...segments] = path.split(".");
      const data = Utilities.loadData(this.meta.name, key, {});

      if (!segments.length) return data ?? defaultValue;

      let head = data,
        i = 0;
      for (; i < segments.length - 1; i++) {
        if (head[segments[i]] === undefined) head[segments[i]] = {};
        head = head[segments[i]];
      }

      if (head[segments[i]] === undefined) head[segments[i]] = defaultValue;
      return { data, value: head[segments[i]] }; // return data and value
    }

    saveData(path, value) {
      let [key, ...segments] = path.split(".");

      if (!segments.length) {
        Utilities.saveData(this.meta.name, key, value);
        return;
      }

      const data = Utilities.loadData(this.meta.name, key, {});

      let head = data,
        i = 0;
      for (; i < segments.length - 1; i++) {
        if (head[segments[i]] == null) head[segments[i]] = {};
        head = head[segments[i]];
      }

      head[segments[i]] = value;
      Utilities.saveData(this.meta.name, key, data);
    }

    mapData(path, map) {
      let [key, ...segments] = path.split(".");

      if (!segments.length) {
        Utilities.saveData(
          this.meta.name,
          key,
          map(Utilities.loadData(this.meta.name, key, {}))
        );
        return;
      }

      const data = Utilities.loadData(this.meta.name, key, {});

      let head = data,
        i = 0;
      for (; i < segments.length - 1; i++) {
        if (head[segments[i]] == null) head[segments[i]] = {};
        head = head[segments[i]];
      }

      head[segments[i]] = map(head[segments[i]]);
      Utilities.saveData(this.meta.name, key, data);
    }

    resolveCodeSelection(codeSelection, userId, parentId, guildId) {
      let resolvedCodeSelection = codeSelection;
      if (parentId && resolvedCodeSelection.option === 0) {
        resolvedCodeSelection = this.loadData(
          `${userId}.channels.${parentId}.selectedCode`,
          { option: 0 }
        ).value;
      }
      if (guildId && resolvedCodeSelection.option === 0) {
        resolvedCodeSelection = this.loadData(
          `${userId}.guilds.${guildId}.selectedCode`,
          { option: 0 }
        ).value;
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

    buildCodeOfSpeechMenuItem(channelOrGuild, isGuildContextMenu) {
      const currUserId = UserStore.getCurrentUser()?.id;
      const channelData = this.loadData(
        `${currUserId}.${isGuildContextMenu ? "guilds" : "channels"}.${
          channelOrGuild.id
        }`,
        {}
      ).value;
      channelData.selectedCode = channelData.selectedCode ?? { option: 0 };
      channelData.scanForTriggers =
        channelData.scanForTriggers ?? false;

      let defaultCodeSelection = this.resolveCodeSelection(
        { option: 0 },
        currUserId,
        channelOrGuild.parent_id,
        channelOrGuild.guild_id
      );

      let defaultCodeSelectionlabel;
      switch (channelOrGuild.parent_id ? 0 : channelOrGuild.guild_id ? 1 : 2) {
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
        checked: channelData.selectedCode.option === 0,
        action: () => {
          this.saveData(
            `${currUserId}.${isGuildContextMenu ? "guilds" : "channels"}.${
              channelOrGuild.id
            }.selectedCode`,
            { option: 0 }
          );
          ContextMenu.forceUpdateMenus();
        },
      });

      if (channelData.selectedCode.option === 2 && !this.codes[channelData.selectedCode.id]) {
        codeEnablersGroup.items.push({
          type: "radio",
          label: "● " + channelData.selectedCode.id,
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
          checked:
            channelData.selectedCode.option === 2 &&
            channelData.selectedCode.id === codesKey,
          action: () => {
            this.saveData(
              `${currUserId}.${isGuildContextMenu ? "guilds" : "channels"}.${
                channelOrGuild.id
              }.selectedCode`,
              {
                option: 2,
                id: codesKey,
              }
            );
            ContextMenu.forceUpdateMenus();
          },
        });
      }

      codeEnablersGroup.items.push({
        type: "radio",
        label: "None",
        checked: channelData.selectedCode.option === 1,
        action: () => {
          this.saveData(
            `${currUserId}.${isGuildContextMenu ? "guilds" : "channels"}.${
              channelOrGuild.id
            }.selectedCode`,
            {
              option: 1,
            }
          );
          ContextMenu.forceUpdateMenus();
        },
      });

      const optionsGroup = {
        type: "group",
        items: [
          {
            type: "toggle",
            label: "Scan For Triggers",
            checked: channelData.scanForTriggers,
            action: () => {
              this.mapData(
                `${currUserId}.${isGuildContextMenu ? "guilds" : "channels"}.${
                  channelOrGuild.id
                }.scanForTriggers`,
                (scanForTriggers) => !scanForTriggers
              );
              ContextMenu.forceUpdateMenus();
            },
          }
        ],
      };

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
                optionsGroup,
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
      const currUser = UserStore.getCurrentUser();

      const codeSelectionId = this.resolveCodeSelection(
        this.loadData(
          `${currUser?.id}.channels.${instance.props.channel.id}.selectedCode`,
          { option: 0 }
        ).value,
        currUser?.id,
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
        if (!rule(text)) {
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
            () => this.buildCodeOfSpeechMenuItem(props.channel, false),
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
            () => this.buildCodeOfSpeechMenuItem(props.channel, false),
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
            () => this.buildCodeOfSpeechMenuItem(props.channel, false),
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
            () => this.buildCodeOfSpeechMenuItem(props.channel, false),
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
            () => this.buildCodeOfSpeechMenuItem(props.guild, true),
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
          messageId;
        }

        for (const textArea of node.querySelectorAll(
          DiscordSelectors.Textarea.textArea
        )) {
          this.patchTextArea(textArea);
        }
      } else if (
        e.removedNodes.length &&
        e.removedNodes[0] instanceof Element
      ) {
        const node = e.removedNodes[0];
        if (node.matches(DiscordSelectors.Textarea.textArea)) {
          this.unpatchTextArea(node);
        } else {
          // TODO: invert so we go from latest to oldest
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
        output += `(${regStr})|`;
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
        pattern: ({ patterns, negate = false, regex = {}, ignore = {} }) => {
          regex = Object.assign(
            {
              escapeSpecialCharacters: false,
              caseInsensitive: false,
              multiline: false,
              unicode: false,
            },
            regex
          );
          ignore = Object.assign(
            {
              textUnderWordCount: 0,
              emojis: false,
              urls: false,
              codeBlocks: false,
              italics: false,
            },
            ignore
          );

          if (!Array.isArray(patterns) || patterns.length <= 0)
            return { error: "'patterns' must be a non-empty array" };
          if (typeof negate !== "boolean")
            return { error: "'negate' must be a boolean" };

          if (typeof regex !== "object")
            return { error: "'regex' must be an object" };
          if (typeof regex.escapeSpecialCharacters !== "boolean")
            return {
              error: "'regex.escapeSpecialCharacters' must be a boolean",
            };
          if (typeof regex.caseInsensitive !== "boolean")
            return { error: "'regex.caseInsensitive' must be a boolean" };
          if (typeof regex.multiline !== "boolean")
            return { error: "'regex.multiline' must be a boolean" };
          if (typeof regex.unicode !== "boolean")
            return { error: "'regex.unicode' must be a boolean" };

          if (typeof ignore !== "object")
            return { error: "'ignore' must be an object" };
          if (typeof ignore.textUnderWordCount !== "number")
            return { error: "'ignore.textUnderWordCount' must be a number" };
          if (typeof ignore.emojis !== "boolean")
            return { error: "'ignore.emojis' must be a boolean" };
          if (typeof ignore.urls !== "boolean")
            return { error: "'ignore.urls' must be a boolean" };
          if (typeof ignore.codeBlocks !== "boolean")
            return { error: "'ignore.codeBlocks' must be a boolean" };
          if (typeof ignore.italics !== "boolean")
            return { error: "'ignores.italics' must be a boolean" };

          let ignoreRegStrs = [];
          if (ignore.emojis)
            ignoreRegStrs.push(
              this.regStrs.unicodeEmoji,
              this.regStrs.customEmoji
            );
          if (ignore.urls) ignoreRegStrs.push(this.regStrs.url);
          if (ignore.codeBlocks) ignoreRegStrs.push(this.regStrs.codeBlocks);
          if (ignore.italics) ignoreRegStrs.push(this.regStrs.italics);

          const ignoresRegExpr = new RegExp(
            this.combineRegStrs(ignoreRegStrs),
            "gu"
          );

          if (regex.escapeSpecialCharacters)
            patterns = patterns.map(this.escapeRegSpecialChars.bind(this));

          const matchesRegExpr = new RegExp(
            this.combineRegStrs(patterns),
            "g" +
              ((regex.caseInsensitive ? "i" : "") +
                (regex.multiline ? "m" : "") +
                (regex.unicode ? "u" : ""))
          );

          return {
            success: (text) => {
              if (
                0 < ignore.textUnderWordCount &&
                text.match(this.regExprs.words) < ignore.textUnderWordCount
              )
                return true;

              text = text.replace(ignoresRegExpr, "");
              return (text.match(matchesRegExpr) == null) ^ !negate;
            },
          };
        },

        word: ({ words, negate = false, regex = {}, ignore = {} }) => {
          regex = Object.assign(
            {
              escapeSpecialCharacters: true,
              caseInsensitive: true,
              multiline: false,
              unicode: false,
            },
            regex
          );
          ignore = Object.assign(
            {
              textUnderWordCount: 0,
              emojis: true,
              urls: true,
              codeBlocks: false,
              italics: false,
            },
            ignore
          );

          // TODO: assert that every item in words is a non-empty string
          if (!Array.isArray(words) || words.length <= 0)
            return { error: "'words' must be a non-empty array" };
          if (typeof negate !== "boolean")
            return { error: "'negate' must be a boolean" };

          if (typeof regex !== "object")
            return { error: "'regex' must be an object" };
          if (typeof regex.escapeSpecialCharacters !== "boolean")
            return {
              error: "'regex.escapeSpecialCharacters' must be a boolean",
            };
          if (typeof regex.caseInsensitive !== "boolean")
            return { error: "'regex.caseInsensitive' must be a boolean" };
          if (typeof regex.multiline !== "boolean")
            return { error: "'regex.multiline' must be a boolean" };
          if (typeof regex.unicode !== "boolean")
            return { error: "'regex.unicode' must be a boolean" };

          if (typeof ignore !== "object")
            return { error: "'ignore' must be an object" };
          if (typeof ignore.textUnderWordCount !== "number")
            return { error: "'ignore.textUnderWordCount' must be a number" };
          if (typeof ignore.emojis !== "boolean")
            return { error: "'ignore.emojis' must be a boolean" };
          if (typeof ignore.urls !== "boolean")
            return { error: "'ignore.urls' must be a boolean" };
          if (typeof ignore.codeBlocks !== "boolean")
            return { error: "'ignore.codeBlocks' must be a boolean" };
          if (typeof ignore.italics !== "boolean")
            return { error: "'ignores.italics' must be a boolean" };

          let ignoreRegStrs = [];
          if (ignore.emojis)
            ignoreRegStrs.push(
              this.regStrs.unicodeEmoji,
              this.regStrs.customEmoji
            );
          if (ignore.urls) ignoreRegStrs.push(this.regStrs.url);
          if (ignore.codeBlocks) ignoreRegStrs.push(this.regStrs.codeBlocks);
          if (ignore.italics) ignoreRegStrs.push(this.regStrs.italics);

          const ignoresRegExpr = new RegExp(
            this.combineRegStrs(ignoreRegStrs),
            "gu"
          );

          if (regex.escapeSpecialCharacters)
            words = words.map(this.escapeRegSpecialChars.bind(this));

          const matchesRegExpr = new RegExp(
            `(?<!\\w'?)(${this.combineRegStrs(words)})(?!\\w)`,
            "g" +
              ((regex.caseInsensitive ? "i" : "") +
                (regex.multiline ? "m" : "") +
                (regex.unicode ? "u" : ""))
          );

          return {
            success: (text) => {
              if (
                0 < ignore.textUnderWordCount &&
                text.match(this.regExprs.words) < ignore.textUnderWordCount
              )
                return true;

              text = text.replace(ignoresRegExpr, "");
              return (text.match(matchesRegExpr) == null) ^ !negate;
            },
          };
        },

        wordFrequency: ({
          words,
          frequency,
          negate = false,
          regex = {},
          ignore = {},
        }) => {
          regex = Object.assign(
            {
              escapeSpecialCharacters: true,
              caseInsensitive: true,
              multiline: false,
              unicode: false,
            },
            regex
          );
          ignore = Object.assign(
            {
              textUnderWordCount: 0,
              emojis: true,
              urls: true,
              codeBlocks: false,
              italics: false,
            },
            ignore
          );

          if (!Array.isArray(words) || words.length <= 0)
            return { error: "'words' must be a non-empty array" };
          if (typeof frequency !== "number")
            return { error: "'frequency' must be a number" };
          if (typeof negate !== "boolean")
            return { error: "'negate' must be a boolean" };

          if (typeof regex !== "object")
            return { error: "'regex' must be an object" };
          if (typeof regex.escapeSpecialCharacters !== "boolean")
            return {
              error: "'regex.escapeSpecialCharacters' must be a boolean",
            };
          if (typeof regex.caseInsensitive !== "boolean")
            return { error: "'regex.caseInsensitive' must be a boolean" };
          if (typeof regex.multiline !== "boolean")
            return { error: "'regex.multiline' must be a boolean" };
          if (typeof regex.unicode !== "boolean")
            return { error: "'regex.unicode' must be a boolean" };

          if (typeof ignore !== "object")
            return { error: "'ignore' must be an object" };
          if (typeof ignore.textUnderWordCount !== "number")
            return { error: "'ignore.textUnderWordCount' must be a number" };
          if (typeof ignore.emojis !== "boolean")
            return { error: "'ignore.emojis' must be a boolean" };
          if (typeof ignore.urls !== "boolean")
            return { error: "'ignore.urls' must be a boolean" };
          if (typeof ignore.codeBlocks !== "boolean")
            return { error: "'ignore.codeBlocks' must be a boolean" };
          if (typeof ignore.italics !== "boolean")
            return { error: "'ignores.italics' must be a boolean" };

          let ignoreRegStrs = [];
          if (ignore.emojis)
            ignoreRegStrs.push(
              this.regStrs.unicodeEmoji,
              this.regStrs.customEmoji
            );
          if (ignore.urls) ignoreRegStrs.push(this.regStrs.url);
          if (ignore.codeBlocks) ignoreRegStrs.push(this.regStrs.codeBlocks);
          if (ignore.italics) ignoreRegStrs.push(this.regStrs.italics);

          const ignoresRegExpr = new RegExp(
            this.combineRegStrs(ignoreRegStrs),
            "gu"
          );

          if (regex.escapeSpecialCharacters)
            words = words.map(this.escapeRegSpecialChars.bind(this));

          const matchesRegExpr = new RegExp(
            `(?<!\\w'?)(${this.combineRegStrs(words)})(?!\\w)`,
            "g" +
              ((regex.caseInsensitive ? "i" : "") +
                (regex.multiline ? "m" : "") +
                (regex.unicode ? "u" : ""))
          );

          return {
            success: (text) => {
              text = text.replace(ignoresRegExpr, "");
              const matches = text.match(matchesRegExpr) || [];
              const nonMatches =
                text.replace(matchesRegExpr, "")?.match(this.regExprs.words) ||
                [];

              const requiredMatches = Math.ceil(nonMatches.length / frequency);

              return (
                (ignore.textUnderWordCount <= nonMatches.length &&
                  matches.length < requiredMatches) ^ !negate
              );
            },
          };
        },

        syllableCount: ({
          min = -1,
          max = Number.MAX_VALUE,
          negate = false,
          ignore = {},
        }) => {
          ignore = Object.assign(
            {
              codeBlocks: false,
              italics: false,
            },
            ignore
          );

          if (typeof min !== "number")
            return { error: "'min' must be a number" };
          if (typeof max !== "number")
            return { error: "'max' must be a number" };
          if (typeof negate !== "boolean")
            return { error: "'negate' must be a boolean" };

          if (typeof ignore !== "object")
            return { error: "'ignore' must be an object" };
          if (typeof ignore.codeBlocks !== "boolean")
            return { error: "'ignore.codeBlocks' must be a boolean" };
          if (typeof ignore.italics !== "boolean")
            return { error: "'ignores.italics' must be a boolean" };

          let ignoreRegStrs = [this.regStrs.customEmoji, this.regStrs.url];
          if (ignore.codeBlocks) ignoreRegStrs.push(this.regStrs.codeBlocks);
          if (ignore.italics) ignoreRegStrs.push(this.regStrs.italics);

          const ignoresRegExpr = new RegExp(
            this.combineRegStrs(ignoreRegStrs),
            "gu"
          );

          return {
            success: (text) => {
              text = text.replace(ignoresRegExpr, "");
              const words = text.match(this.regExprs.words) || [];

              // TODO: always count the syllables of all words

              for (let word of words) {
                word = word.toLowerCase();
                word = word.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, "");
                word = word.replace(/^y/, "");

                const syllableCount = word.match(/[aeiouy]{1,2}/g)?.length;
                if ((syllableCount <= min || max < syllableCount) ^ negate) {
                  return false;
                }
              }

              return true;
            },
          };
        },

        capitalization: ({
          negate = false,
          ignore = {
            textUnderWordCount: 0,
            fullCaps: false,
            codeBlocks: false,
            italics: false,
          },
        }) => {
          ignore = Object.assign(
            {
              textUnderWordCount: 0,
              fullCaps: false,
              codeBlocks: false,
              italics: false,
            },
            ignore
          );

          if (typeof negate !== "boolean")
            return { error: "'negate' must be a boolean" };

          if (typeof ignore !== "object")
            return { error: "'ignore' must be an object" };
          if (typeof ignore.textUnderWordCount !== "number")
            return { error: "'ignore.textUnderWordCount' must be a number" };
          if (typeof ignore.fullCaps !== "boolean")
            return { error: "'ignore.fullCaps' must be a boolean" };
          if (typeof ignore.codeBlocks !== "boolean")
            return { error: "'ignore.codeBlocks' must be a boolean" };
          if (typeof ignore.italics !== "boolean")
            return { error: "'ignores.italics' must be a boolean" };

          let ignoreRegStrs = [this.regStrs.customEmoji, this.regStrs.url];
          if (ignore.codeBlocks) ignoreRegStrs.push(this.regStrs.codeBlocks);
          if (ignore.italics) ignoreRegStrs.push(this.regStrs.italics);

          const ignoresRegExpr = new RegExp(
            this.combineRegStrs(ignoreRegStrs),
            "gu"
          );

          const matchesRegExpr = ignore.fullCaps
            ? this.regExprs.notFullCapsCapitalizedWords
            : this.regExprs.capitalizedWords;

          return {
            success: (text) => {
              if (
                0 < ignore.textUnderWordCount &&
                text.match(this.regExprs.words) < ignore.textUnderWordCount
              )
                return true;

              text = text.replace(ignoresRegExpr, "");
              return (text.match(matchesRegExpr) == null) ^ !negate;
            },
          };
        },
      };
    }

    loadCodes(codesData) {
      const currUserId = UserStore.getCurrentUser()?.id;
      this.codes = {};

      for (const codesDataKey in codesData) {
        if (!codesDataKey.match(this.regExprs.validCodeName)) {
          Logger.err(
            `While loading '${codesDataKey}' code: the name for the code can only contain alphanumerics, underscores, dashes, apostrophes, and spaces, it must not begin nor end with a space, and it must be no longer than 20 characters`
          );
          continue;
        }

        const codeData = codesData[codesDataKey];

        if (codeData.trigger != null && typeof codeData.trigger !== "string") {
          Logger.err(
            `While loading '${codesDataKey}' code: 'trigger' must be a string`
          );
          continue;
        }
        if (
          codeData.messageOnTrigger != null &&
          typeof codeData.messageOnTrigger !== "string"
        ) {
          Logger.err(
            `While loading '${codesDataKey}' code: 'messageOnTrigger' must be a string`
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
          trigger: codeData.trigger
            ? new RegExp(
                Utilities.formatTString(codeData.trigger, {
                  mention: `<@${currUserId}>`,
                }),
                "i"
              )
            : undefined,
          messageOnTrigger: codeData.messageOnTrigger ?? "",
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

          let res = this.ruleTypes[ruleData.type](ruleData);
          if (res.error) {
            Logger.err(
              `While loading '${rulesDataKey}' rule of '${codesDataKey}' code: ${res.error}`
            );
            continue;
          }

          this.codes[codesDataKey].rules[rulesDataKey] = res.success;
        }
      }

      Logger.info("Done loading codes");
    }

    loadReg() {
      this.regStrs = {
        unicodeEmoji:
          "(\\p{Extended_Pictographic}\\u{200D})*\\p{Extended_Pictographic}\\u{FE0F}?",
        customEmoji: "<a?:[\\w~]{2,}:\\d{18}>",
        url: "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)",
        codeBlocks:
          "(`[^`\\n\\r]+?`(?!`))|(``[^`\\n\\r]+?``(?!`))|(```(.|\\n|\\r)*?```)",
        italics:
          "(?<!(?<!\\\\)\\\\(\\\\\\\\)*|\\*)\\*(\\*\\*)*(?!\\*).+?(?<!(?<!\\\\)\\\\(\\\\\\\\)*|\\*)\\*(\\*\\*)*(?!\\*)",
      };

      this.regExprs = {
        notFullCapsCapitalizedWords:
          /(?<!\w'?)[A-Z](?!'?[A-Z\d_]+(\W|$))(\w)*('\w+)?/g,
        capitalizedWords: /(?<!\w'?)[A-Z]\w*('\w+)?/g,
        words: /(?<!\w'?)\w+('\w+)?/g,
        regSpecialChars: /[.*+?^${}()|[\]\\]/g,
        validCodeName: /^(?! )[\w-' ]{0,20}(?<! )$/,
        validRuleName: /^(?! )[\w-' ]{0,40}(?<! )$/,
      };
    }

    // TODO: customizable code violation toast timeout
    // TODO: enumerate rules
    // TODO: exclude code blocks
    // TODO: consider filtering out noises where relevant
    // TODO: consider an auto correct method on rules where relevant
    // TODO: look into LoadMessages
    // TODO: enforce length of code names and rule names, also enforece only using alphanumeric values and spaces
    // TODO: exclude RPNonDialogue and exclude vocalizations
    // TODO: display a toast or something when the codes are refreshed
    // TODO: display notice when a rule or code fails to load
    mapBinarySearch(arr, map, target, begin = 0, end = arr.length - 1) {
      while (begin <= end) {
        let mid = Math.floor((begin + end) / 2);

        const value = map(arr[mid]);
        if (value === target) return mid;
        else if (value < target) begin = mid + 1;
        else end = mid - 1;
      }
    }

    matchTriggers(text) {
      const triggeredCodesIds = [];
      for (const codesKey in this.codes) {
        const code = this.codes[codesKey];
        if (code.trigger && text.match(code.trigger)) {
          triggeredCodesIds.push(codesKey);
        }
      }

      return triggeredCodesIds;
    }

    scanMessage(message) {
      Logger.info(message);

      const currUserId = UserStore.getCurrentUser()?.id;
      let { data, value: channelData } = this.loadData(
        `${currUserId}.channels.${message.channel_id}`,
        {}
      );

      if (!channelData.scanForTriggers) return;

      channelData.selectedCode = channelData.selectedCode ?? { option: 0 };
      channelData.positivelyScannedMessages =
        channelData.positivelyScannedMessages ?? {};

      if (channelData.positivelyScannedMessages[message.id] !== undefined)
        return;

      const triggeredCodesIds = this.matchTriggers(message.content);
      if (!triggeredCodesIds.length) return;

      const chatContent = document.querySelector(".chatContent-3KubbW");
      const elems = chatContent.querySelectorAll(
        `.contents-2MsGLg [id^="message-content-"]`
      );

      const index = this.mapBinarySearch(
        elems,
        (elem) => elem.id.substring(16, elem.id.length),
        message.id
      );

      if (index === undefined) return;

      const { top, bottom } = elems[index].getBoundingClientRect();
      if (bottom < 0 || window.innerHeight < top) return;

      channelData.selectedCode = {
        option: 2,
        id: triggeredCodesIds[triggeredCodesIds.length - 1],
      };
      channelData.positivelyScannedMessages[message.id] = true;
      for (const triggeredCodeId of triggeredCodesIds) {
        // TODO: get name in guild if available
        Api.Toasts.info(
          Utilities.formatTString(
            this.codes[triggeredCodeId].messageOnTrigger,
            {
              author: message.author.globalName,
            }
          ),
          {
            timeout: 5000,
          }
        );
      }

      this.saveData(currUserId, data);
    }

    scanVisibleMessages() {
      const currUserId = UserStore.getCurrentUser()?.id;
      const selectedChannelId =
        SelectedChannelStore.getCurrentlySelectedChannelId();

      let { data, value: channelData } = this.loadData(
        `${currUserId}.channels.${selectedChannelId}`,
        {}
      );
      
      if (!channelData.scanForTriggers) return;

      channelData.selectedCode = channelData.selectedCode ?? { option: 0 };
      channelData.positivelyScannedMessages =
        channelData.positivelyScannedMessages ?? {};

      const chatContent = document.querySelector(".chatContent-3KubbW");
      const elems = chatContent.querySelectorAll(
        `.contents-2MsGLg [id^="message-content-"]`
      );

      if (!elems.length) return;

      let begin = 0;
      let end = elems.length - 1;
      let visibleIndex = 0;
      while (begin <= end) {
        visibleIndex = Math.floor((begin + end) / 2);

        const { top, bottom } = elems[visibleIndex].getBoundingClientRect();
        if (bottom < 0) begin = visibleIndex + 1;
        else if (window.innerHeight < top) end = visibleIndex - 1;
        else break;
      }

      let topVisibleIndex = visibleIndex;
      for (; 0 < topVisibleIndex; topVisibleIndex--) {
        if (elems[topVisibleIndex].getBoundingClientRect().bottom < 0) {
          break;
        }
      }

      let bottomVisibleIndex = visibleIndex;
      for (; bottomVisibleIndex < elems.length - 1; bottomVisibleIndex++) {
        if (
          window.innerHeight <
          elems[bottomVisibleIndex].getBoundingClientRect().top
        ) {
          break;
        }
      }

      const messages = MessageStore.getMessages(selectedChannelId)._array;

      if (messages.length !== elems.length) {
        Logger.warn(
          "Discrepancy between the number of message contents and messages!"
        );
      }

      let someMessageScannedPositively = false;
      for (let i = topVisibleIndex; i <= bottomVisibleIndex; i++) {
        if (
          channelData.positivelyScannedMessages[messages[i].id] !== undefined ||
          messages[i].state !== "SENT"
        )
          continue;

        const triggeredCodesIds = this.matchTriggers(messages[i].content);
        if (!triggeredCodesIds.length) continue;

        channelData.selectedCode = {
          option: 2,
          id: triggeredCodesIds[triggeredCodesIds.length - 1],
        };
        someMessageScannedPositively = channelData.positivelyScannedMessages[
          messages[i].id
        ] = true;
        for (const triggeredCodeId of triggeredCodesIds) {
          // TODO: get name in guild if available
          Api.Toasts.info(
            Utilities.formatTString(
              this.codes[triggeredCodeId].messageOnTrigger,
              {
                author: messages[i].author.globalName,
              }
            ),
            {
              timeout: 5000,
            }
          );
        }
      }

      if (someMessageScannedPositively) this.saveData(currUserId, data);
    }

    patchDispatcher() {
      Patcher.after(Dispatcher, "dispatch", (_0, args, _2) => {
        const e = args[0];
        if (!e) return;

        if (e.type === "MESSAGE_CREATE") {
          if (e.optimistic === true) return;

          const selectedChannelId =
            SelectedChannelStore.getCurrentlySelectedChannelId();
          if (e.channelId !== selectedChannelId) return;

          this.scanMessage(
            MessageStore.getMessage(selectedChannelId, e.message.id)
          );
        } else if (e.type === "MESSAGE_UPDATE") {
          const selectedChannelId =
            SelectedChannelStore.getCurrentlySelectedChannelId();
          if (e.message.channel_id !== selectedChannelId) return;

          this.scanMessage(
            MessageStore.getMessage(selectedChannelId, e.message.id)
          );
        } else if (e.type === "UPDATE_VISIBLE_MESSAGES") {
          this.scanVisibleMessages();
        }
      });
    }

    onStart() {
      DOMTools.addStyle(
        this.meta.name,
        `
        .bd-settings-container.cos-bd-settings-container {
          padding-left: 15px;
        }
        .bd-settings-title.bd-settings-group-title.cos-bd-settings-group-title {
          margin-bottom: 2px;
          margin-top: 0px;
        }
        `
      );

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
      this.patchDispatcher();
    }

    onStop() {
      DOMTools.removeStyle(this.meta.name);
      Patcher.unpatchAll();
      this.unpatchContextMenus();
    }
  };
};
