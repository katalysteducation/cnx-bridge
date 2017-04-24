import {template, createElement} from "../../../utilities/travrs";

// Create Response Element.
export const responseEl = ({avatar, date, user, note}) =>
  template(`
  div.cnxb-comment
    div.cnxb-comment-header
      div.cnxb-comment-avatar[style="background-color:${avatar}"]
      div.cnxb-comment-heading
        h4 > "${user}"
        span.cnxb-comment-date > "${date}"
    div.cnxb-comment-message > "${note}"
  `);


// Create Comment Element.
export const commentEl = ({id, avatar, date, user, note, responses = []}) => {
  const refs = {
    responses: responses.reduce((result, res) => {
      result.appendChild(responseEl(res));
      return result;
    }, createElement ('div'))
  };

  return template(refs, `
  div.cnxb-comment[data-comment-id="${id}"]
    div.cnxb-comment-header
      div.cnxb-comment-avatar[style="background-color:${avatar}"]
      div.cnxb-comment-heading
        h4 > "${user}"
        span.cnxb-comment-date > "${date}"
      div.cnxb-comment-buttons
        button.cnxb-comment-show[data-scroll="${id}"]
          i.material-icons > "remove_red_eye"
        div.cnxb-toggle
          input[id="toggle-${id}" type="checkbox" checked="true" data-close="${id}"]
          label[for="toggle-${id}"] > "CLOSE"
    div.cnxb-comment-message > "${note}"
    div.cnxb-comment-responses
      @responses
    div.cnxb-comment-response
      input[type="text" placeholder="Response to the comment"]
      button.accept[data-response="${id}"] > "✔"
      button.cancel[data-cancel="true"] > "✖"
  `);
};
