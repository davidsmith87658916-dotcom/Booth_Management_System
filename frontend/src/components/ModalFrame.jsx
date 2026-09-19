import { useEffect, useRef } from 'react';
export default function ModalFrame({ children, onClose, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }} className="modal-frame"><div className="modal-frame-content">{children}</div></dialog>;
}
