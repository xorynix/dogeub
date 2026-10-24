import { meta } from '/src/utils/config';
import {
  themeConfig,
  appsPerPageConfig,
  navScaleConfig,
  searchConfig,
  prConfig,
  designConfig,
} from '/src/utils/config';
import { exportSettings, importSettings } from '/src/utils/settingsExport';
import { PATCH_LOGS_KEY, isPatchLogsEnabled } from '/src/components/PatchLogs';
import { resolveWispServer } from '/src/utils/hooks/loader/wispServer';

export const privacyConfig = ({ options, updateOption, openPanic }) => {
  const isCustom = options.isCustomCloak || (options.tabName && !meta.find(c => c.value.tabName === options.tabName));
  const metaWithCustom = [
    ...meta,
    { option: 'Custom', value: { id: 'custom', isCustomCloak: true } }
  ];

  const config = {
    1: {
      name: 'Site Title',
      desc: "This setting allows you to change the site's tab title and icon.",
      config: metaWithCustom,
      value: isCustom
        ? metaWithCustom[metaWithCustom.length - 1].value
        : (meta.find(
            (c) => c.value && typeof c.value === 'object' && c.value.tabName === options.tabName,
          ) || meta[0]).value,
      type: 'select',
      action: (a) => {
        if (a.isCustomCloak) {
          updateOption({ isCustomCloak: true });
        } else {
          updateOption({ ...a, isCustomCloak: false });
          import('/src/utils/utils.js').then(({ ckOff }) => ckOff());
        }
      },
    }
  };

  if (isCustom) {
    config[2] = {
      name: 'Custom Tab Title',
      desc: 'Set a custom title for the site tab.',
      value: options.tabName === meta[0].value.tabName ? '' : (options.tabName || ''),
      type: 'input',
      action: (b) => {
        updateOption({ tabName: b || meta[0].value.tabName });
        import('/src/utils/utils.js').then(({ ckOff }) => ckOff());
      },
    };
    config[3] = {
      name: 'Custom Tab Icon',
      desc: 'Set a custom tab icon (URL) for the site.',
      value: options.tabIcon === meta[0].value.tabIcon ? '' : (options.tabIcon || ''),
      type: 'input',
      action: (b) => {
        updateOption({ tabIcon: b || meta[0].value.tabIcon });
        import('/src/utils/utils.js').then(({ ckOff }) => ckOff());
      },
    };
  }

  config[4] = {
    name: 'Auto Cloak',
    desc: 'Automatically apply the selected cloak when you switch tabs, restore original when you return.',
    value: !!options.clkOff,
    type: 'switch',
    action: (b) => {
      setTimeout(() => {
        updateOption({ clkOff: b });
        import('/src/utils/utils.js').then(({ ckOff }) => ckOff());
      }, 100);
    },
    disabled: !options.tabName || options.tabName == meta[0].value.tabName,
  };

  config[5] = {
    name: 'Open about:blank on startup',
    desc: 'When enabled, the about:blank tab opens automatically when you visit.',
    value:
      options.aboutBlankAutoOpen === true ||
      (options.aboutBlank && options.aboutBlankAutoOpen !== false),
    type: 'switch',
    action: (b) => setTimeout(() => updateOption({ aboutBlankAutoOpen: b }), 100),
  };

  config[6] = {
    name: 'Panic Key',
    desc: 'Enable or disable the panic key option.',
    value: !!options.panicToggleEnabled,
    type: 'switch',
    action: (b) => {
      setTimeout(() => {
        updateOption({ panicToggleEnabled: b });
        import('/src/utils/utils.js').then(({ panic }) => panic());
      }, 100);
    },
  };

  config[7] = {
    name: 'Panic Shortcut',
    desc: 'Set a keybind/shortcut that redirects you to a page when pressed.',
    value: 'Set Key',
    type: 'button',
    action: openPanic,
    disabled: !!!options.panicToggleEnabled,
  };

  return config;
};

export const customizeConfig = ({ options, updateOption }) => ({
  1: {
    name: 'Site Theme',
    desc: 'Customize the appearance of the website by selecting a theme.',
    config: themeConfig,
    value: find(themeConfig, (c) => c.value?.themeName === options.themeName, 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
  2: {
    name: 'Background Design',
    desc: "Customize the site's background design.",
    config: designConfig,
    value: find(designConfig, (c) => c.value?.bgDesign === options.bgDesign, 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
  3: {
    name: 'Apps per Page',
    desc: 'Number of apps to show per page ("All" will show everything).',
    config: appsPerPageConfig,
    value: find(appsPerPageConfig, (c) => c.value.itemsPerPage === (options.itemsPerPage ?? 20), 2),
    type: 'select',
    action: (a) => updateOption(a),
  },
  4: {
    name: 'Navigation Scale',
    desc: 'Scale navigation bar size (logo & font) globally.',
    config: navScaleConfig,
    value: find(navScaleConfig, (c) => c.value.navScale === (options.navScale ?? 1), 3),
    type: 'select',
    action: (a) => updateOption(a),
  },
  5: {
    name: 'Tabs Bar',
    desc: 'Show the tabs bar, allowing you to open multiple sites when browsing.',
    value: options.showTb ?? true,
    type: 'switch',
    action: (b) => setTimeout(() => updateOption({ showTb: b }), 100),
  },
  6: {
    name: 'Donation button',
    desc: 'Toggle whether you want the "Support us" button to show.',
    value: options.donationBtn ?? true,
    type: 'switch',
    action: (b) => setTimeout(() => updateOption({ donationBtn: b }), 100),
  },
  7: {
    name: 'Compact App Header',
    desc: 'Shrink the app/game header to a single line.',
    value: options.shrinkHeader ?? false,
    type: 'switch',
    action: (b) => setTimeout(() => updateOption({ shrinkHeader: b }), 100),
  },
  8: {
    name: 'Popular Websites Widget',
    desc: 'Show a homepage widget ranking websites you open from your DOGEUB shortcuts.',
    value: options.popularSitesWidget ?? true,
    type: 'switch',
    action: (b) => updateOption({ popularSitesWidget: b }),
  },
  13: {
    name: 'Device Layout Mode',
    desc: 'Automatically adapt navigation and spacing to your screen, or choose a layout manually.',
    value: options.deviceMode || 'auto',
    type: 'device-mode',
    action: (mode) => updateOption({ deviceMode: mode }),
  },
  9: {
    name: 'Most Played Games Widget',
    desc: 'Show a homepage widget for games launched through DOGEUB when game activity tracking is available.',
    value: options.mostPlayedGamesWidget ?? true,
    type: 'switch',
    action: (b) => updateOption({ mostPlayedGamesWidget: b }),
  },
  10: {
    name: 'Pet Buddy',
    desc: 'Show a tiny animated animal buddy that pops up with random cute messages.',
    value: options.petBuddyEnabled ?? false,
    type: 'switch',
    action: (b) => setTimeout(() => updateOption({ petBuddyEnabled: b }), 100),
  },
  11: {
    name: 'Pet Buddy Animal',
    desc: 'Choose which little animal hangs out on your screen.',
    config: [
      { option: '🐱 Cat — Mochi', value: { petBuddyAnimal: 'cat' } },
      { option: '🐶 Dog — Biscuit', value: { petBuddyAnimal: 'dog' } },
      { option: '🐰 Bunny — Bunbun', value: { petBuddyAnimal: 'bunny' } },
      { option: '🦊 Fox — Pip', value: { petBuddyAnimal: 'fox' } },
      { option: '🐻 Bear — Honey', value: { petBuddyAnimal: 'bear' } },
      { option: '🐼 Panda — Bamboo', value: { petBuddyAnimal: 'panda' } },
      { option: '🐧 Penguin — Pebble', value: { petBuddyAnimal: 'penguin' } },
      { option: '🐸 Frog — Sprout', value: { petBuddyAnimal: 'frog' } },
      { option: '🦆 Duck — Waffles', value: { petBuddyAnimal: 'duck' } },
      { option: '🦫 Capybara — Cappy', value: { petBuddyAnimal: 'capybara' } },
    ],
    value: find([
      { option: 'Cat', value: { petBuddyAnimal: 'cat' } },
      { option: 'Dog', value: { petBuddyAnimal: 'dog' } },
      { option: 'Bunny', value: { petBuddyAnimal: 'bunny' } },
      { option: 'Fox', value: { petBuddyAnimal: 'fox' } },
      { option: 'Bear', value: { petBuddyAnimal: 'bear' } },
      { option: 'Panda', value: { petBuddyAnimal: 'panda' } },
      { option: 'Penguin', value: { petBuddyAnimal: 'penguin' } },
      { option: 'Frog', value: { petBuddyAnimal: 'frog' } },
      { option: 'Duck', value: { petBuddyAnimal: 'duck' } },
      { option: 'Capybara', value: { petBuddyAnimal: 'capybara' } },
    ], (c) => c.value.petBuddyAnimal === (options.petBuddyAnimal || 'cat'), 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
  12: {
    name: 'Show patch logs on load',
    desc: 'Show the Patch Logs panel listing recent changes every time the site loads.',
    value: isPatchLogsEnabled(),
    type: 'switch',
    action: (b) => {
      try {
        localStorage.setItem(PATCH_LOGS_KEY, String(b));
      } catch {}
    },
  },
});

export const browsingConfig = ({ options, updateOption }) => ({
  1: {
    name: 'Search Engine',
    desc: 'Choose the default search engine used for queries.',
    config: searchConfig,
    value: find(searchConfig, (c) => c.value?.engine === options.engine, 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
  2: {
    name: 'Backend Engine',
    desc: 'Choose the default engine used for browsing.',
    config: prConfig,
    value: find(prConfig, (c) => c.value?.prType === options.prType, 0),
    type: 'select',
    action: (a) => updateOption(a),
  },
});

export const advancedConfig = ({ options, updateOption }) => ({
  1: {
    name: 'Confirm Leave',
    desc: 'Show a confirmation when attempting to leave the site.',
    value: !!options.beforeUnload,
    type: 'switch',
    action: (b) => {
      setTimeout(() => updateOption({ beforeUnload: b }));
      location.reload();
    },
  },
  2: {
    name: 'Wisp Config',
    desc: 'Configure the websocket server location.',
    value: resolveWispServer(options.wServer),
    type: 'input',
    action: (b) => updateOption({ wServer: b || null }),
  },
  ...(POPUNDER_ENABLED === 'true'
    ? {
        3: {
          name: 'Disable Ads',
          desc: 'Enter a key to disable all ads. Given to Premium Supporters & Beta Testers.',
          value: options.adKeyInput || options.adKey || '',
          type: 'input',
          inputValidation: 'adKey',
          action: (b) => updateOption({ adKeyInput: b?.trim() || null }),
        },
      }
    : {}),
  4: {
    name: 'Export Settings',
    desc: 'Download your current settings as a JSON file.',
    type: 'button',
    value: 'Export JSON',
    action: () => exportSettings(),
  },
  5: {
    name: 'Import Settings',
    desc: 'Load settings from a JSON file and reload the site.',
    type: 'button',
    value: 'Import JSON',
    action: () => importSettings(),
  },
  6: {
    name: 'Reset Instance',
    desc: 'Clear your site data if you are having issues.',
    type: 'button',
    value: 'Reset Data',
    action: () => import('/src/utils/utils.js').then(({ resetInstance }) => resetInstance()),
  },
});

function find(config, predicate, fallbackIndex = 0) {
  const found = config.find(predicate);
  return found ? found.value : config[fallbackIndex].value; // fallback
}
