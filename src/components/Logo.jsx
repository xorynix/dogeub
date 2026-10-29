import clsx from 'clsx';
import { useOptions } from '/src/utils/optionsContext';
import { memo, useMemo } from 'react';

const Logo = memo(({ options, action, width, height }) => {
  const { options: op } = useOptions();

  const style = useMemo(() => {
    const lightAdj = op.type === 'light' ? { filter: 'invert(80%)' } : {};
    const dimensions = {
      ...(width && { width }),
      ...(height && { height }),
    };
    return { ...lightAdj, ...dimensions };
  }, [op.type, width, height]);

  const className = useMemo(
    () =>
      clsx(
        options,
        action && 'cursor-pointer duration-300 ease-out scale-[1.12] hover:scale-[1.15]',
        'select-none',
      ),
    [options, action],
  );

  return (
    <img
      src="/logo-os.svg"
      className={className}
      id="btn-logo"
      draggable="false"
      alt="DOGEUB OS"
      onClick={action}
      style={style}
    />
  );
});

Logo.displayName = 'Logo';
export default Logo;
