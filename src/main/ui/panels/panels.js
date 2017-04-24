import { createElement } from "../../../utilities/travrs";

export default function Panels (...panels) {
  const view = createElement('div.cnxb-panels');
  const wrapper = createElement('div.cnxb-panels-wrapper');
  wrapper.style.paddingBottom = '120px';
  view.appendChild(wrapper);

  const select = (id) => {
    // Clear wrapper.
    if (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
    // Append new content.
    if (panels[id] && panels[id] instanceof HTMLElement) wrapper.appendChild(panels[id]);
  }

  select(0);

  return { select, view }
};
