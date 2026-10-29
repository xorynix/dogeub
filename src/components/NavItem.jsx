import { useLocation } from 'react-router-dom';
import { useOptions } from '/src/utils/optionsContext';
import clsx from 'clsx';
import { preload } from '/src/utils/preload';
import { memo } from 'react';

const NavItem = ({ items }) => {
  const loc = useLocation();
  const { options } = useOptions();
  const active = options.navItemActive || '#c1d4f1';
  const scale = Number(options.navScale || 1);

  return (
    <>
      {items.map((item) => {
        const Icon = item.type;

        return (
          <span
            data-device-nav-item="true"
            key={item.id}
            className={clsx(
              'flex gap-1 items-center h-full cursor-pointer',
              loc.pathname !== item.route && 'hover:opacity-80 duration-100',
            )}
            style={{
              ...(loc.pathname == item.route
                ? { color: active, boxShadow: `inset 0 -2px 0 0 ${active}` }
                : null),
              fontSize: `${16 * scale}px`,
            }}
            onClick={item.onClick}
            onMouseEnter={() => preload(item.route)}
            onFocus={() => preload(item.route)}
          >
            {Icon && (
              <Icon
                color={loc.pathname == item.route ? active : undefined}
                size={Math.round(item.size * scale)}
              />
            )}
            <span data-device-nav-label="true">{item.name}</span>
          </span>
        );
      })}
    </>
  );
};

export default memo(NavItem);
