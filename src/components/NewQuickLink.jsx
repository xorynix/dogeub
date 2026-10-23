import clsx from 'clsx';
import { Dialog, DialogPanel, DialogTitle, Button, Input, Label, Field } from '@headlessui/react';
import { useOptions } from '/src/utils/optionsContext';
import { useState } from 'react';

const FieldOption = ({ name, type, state }) => {
  const { options } = useOptions();
  const [form, setForm] = state;

  return (
    <Field>
      <Label className="text-[0.7rem]">{name}</Label>
      <Input
        className={clsx(
          'w-full h-10 pl-3 rounded-lg outline-0 border',
          options.type == 'light' ? 'bg-black/15' : 'bg-black/35',
        )}
        value={form[type]}
        onChange={(e) => setForm({ ...form, [type]: e.target.value })}
      />
    </Field>
  );
};

const NewQuickLink = ({ state, set, update }) => {
  const { options } = useOptions();
  const [form, setForm] = useState({
    name: '',
    icon: '',
    link: '',
  });
  const regex = (link) => (/^(https?:)?\/\//.test(link) ? link : `https://${link}`);
  const clear = () =>
    setForm({
      name: '',
      icon: '',
      link: '',
    });
  const action = () => {
    set(false);
    update({
      ...form,
      link: regex(form.link.trim()),
      icon: regex(form.icon.trim()),
    });
    clear();
  };
  const filled = () => {
    if (form.name && form.link) return true;
    else return false;
  };
  return (
    <>
      <Dialog open={state} onClose={() => set(false)} className="fixed inset-0 bg-black/40 z-50">
        <div className="flex justify-center items-center h-full">
          <DialogPanel
            className="w-[calc(100vw-2rem)] max-w-[30rem] min-h-[20.8rem] max-h-[calc(100dvh-2rem)] overflow-y-auto h-auto p-5 rounded-xl relative flex flex-col gap-3 shadow-2xl"
            style={{ backgroundColor: options.quickModalBgColor || '#252f3e' }}
          >
            <DialogTitle className="text-[1rem] mb-1">Add shortcut</DialogTitle>

            <FieldOption name="Name" type="name" state={[form, setForm]} />
            <FieldOption name="URL" type="link" state={[form, setForm]} />
            <FieldOption name="Icon URL" type="icon" state={[form, setForm]} />

            <div className="absolute bottom-5 right-5 flex flex-row gap-5">
              <Button
                onClick={() => {
                  set(false);
                  clear();
                }}
                className="cursor-pointer duration-150 hover:opacity-80"
              >
                Cancel
              </Button>
              <Button
                onClick={filled() && (() => action())}
                className={clsx(
                  filled() ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-70',
                  'duration-150',
                )}
              >
                Confirm
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
};

export default NewQuickLink;
