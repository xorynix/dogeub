import { useNavigate } from 'react-router-dom';
import NavItem from '../components/NavItem';
import { LayoutGrid, Gamepad2, Cog, Compass, FolderOpen } from 'lucide-react';
import { useOptions } from '/src/utils/optionsContext';
import pkg from '../../package.json';
import nav from '../styles/nav.module.css';
import theme from '../styles/theming.module.css';
import clsx from 'clsx';
import Logo from '../components/Logo';
import { memo, useMemo, useCallback } from 'react';

const version = pkg.version;
const itemSize = 16;

const navItems = [
  { name: 'Apps', id: 'btn-a', type: LayoutGrid, route: '/materials' },
  { name: 'Games', id: 'btn-g', type: Gamepad2, route: '/docs' },
  { name: 'Recommended', id: 'btn-r', type: Compass, route: '/recommended' },
  { name: 'Files', id: 'btn-f', type: FolderOpen, route: '/files' },
  { name: 'Settings', id: 'btn-s', type: Cog, route: '/settings' },
];

const Nav = memo(() => {
  const navigate = useNavigate();
  const { options } = useOptions();

  const scale = Number(options.navScale || 1);
  const dimensions = useMemo(
    () => ({
      navHeight: Math.round(69 * scale),
      logoWidth: Math.round(122 * scale),
      logoHeight: Math.round(41 * scale),
      versionFont: Math.round(9 * scale),
      versionMargin: Math.round(-10 * scale),
    }),
    [scale],
  );

  const handleLogoClick = useCallback(() => navigate('/'), [navigate]);

  const items = useMemo(
    () =>
      navItems.map((item) => ({
        ...item,
        size: itemSize,
        onClick: () => navigate(item.route),
      })),
    [navigate],
  );

  return (
    <div
      className={clsx(
        nav.nav,
        theme['nav-backgroundColor'],
        theme[`theme-${options.theme || 'default'}`],
        ' w-full shadow-x1/20 flex items-center pl-6 pr-5 gap-5 z-50',
      )}
      style={{ height: `${dimensions.navHeight}px` }}
    >
      <Logo width={dimensions.logoWidth} height={dimensions.logoHeight} action={handleLogoClick} />
      <div
        className="border rounded-full text-center"
        style={{
          fontSize: `${dimensions.versionFont}px`,
          marginLeft: `${dimensions.versionMargin}px`,
          paddingLeft: '0.3rem',
          paddingRight: '0.3rem',
        }}
      >
        {'v' + version}
      </div>
      <div className="flex items-center gap-5 ml-auto" style={{ height: 'calc(100% - 0.5rem)' }}>
        <NavItem items={items} />
      </div>
    </div>
  );
});

Nav.displayName = 'Nav';
export default Nav;
