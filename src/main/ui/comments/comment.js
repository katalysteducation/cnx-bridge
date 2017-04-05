import {template, createElement} from "../../../utilities/travrs";

const response = ({avatar, date, user, note}) =>
  template(`
  div.cnxb-comment
    div.cnxb-comment-header
      div.cnxb-comment-avatar[style="background-color:${avatar}"]
      div.cnxb-comment-heading
        h4 > "${user}"
        span.cnxb-comment-date > "${date}"
    div.cnxb-comment-message > "${note}"
  `);


export default function comment ({id, avatar, date, user, note, responses = []}) {
  const refs = {
    responses: responses.reduce((result, res) => {
      result.appendChild(response(res));
      return result;
    }, createElement ('div'))
  };

  return template(refs, `
  div.cnxb-comment[id="${id}"]
    div.cnxb-comment-header
      div.cnxb-comment-avatar[style="background-color:${avatar}"]
      div.cnxb-comment-heading
        h4 > "${user}"
        span.cnxb-comment-date > "${date}"
      div.cnxb-comment-buttons
        button.cnxb-comment-reply
          i.material-icons > "reply"
        div.cnxb-toggle
          input[id="toggle-${id}" type="checkbox" checked="true"]
          label[for="toggle-${id}"]
    div.cnxb-comment-message > "${note}"
    div.cnxb-comment-responses
      @responses
    div.cnxb-comment-response
      input[type="text" placeholder="Response to the comment"]
      button.accept > "✔"
      button.cancel > "✖"
  `);
};
