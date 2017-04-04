import { createElement } from "../../../utilities/travrs";

export default function Panels (...panels) {
  const view = createElement('div.cnxb-panels');

  const select = (id) => {
    // Clear wrapper.
    if (view.firstChild) view.removeChild(view.firstChild);
    // Append new content.
    if (panels[id] && panels[id] instanceof HTMLElement) view.appendChild(panels[id]);
  }

  select(0);

  return { select, view }
};
