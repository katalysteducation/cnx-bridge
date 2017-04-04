
// ---- CONFIGURATION ----------------

// Server URL prefix.
const API_Endpoint = 'https://bridge.katalysteducation.org/backend/api/v1/';

// Requests headers.
const headers = new Headers();

// Request configuration function.
const config = (body = 'body') => {
  return {
    body,
    headers,
    mode: 'cors',
    method: 'POST',
    cache: 'default'
  };
};

// ---- HELPERS ----------------------

// Decode Json Web Token.
const jwtDecode = (token) => {
  let base64Url, base64, jsonStr
  try {
    base64Url = token.split('.')[1];
    base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
  }
  catch (e) {
    // console.warn("JWT-Decode-Error\n", e);
    return;
  }
};

// Call API_Endpoint about provided @method with current @config.
const callAPI = (method, config) => {
  return fetch(API_Endpoint + method, config)
  .then(response => parserResponse(response))
  // .catch(catchRequestsErrors);
};

// Sent to given API_Endpoint @method JSON data.
const sendJsonData = (method, json) => {
  const data = new FormData();
  data.append("data", JSON.stringify(json));
  return callAPI(method, config(data));
};



// ---- METHODS ----------------------

const errorHandles = {};

const signin = (token) => {
  headers.append('Authorization', 'Bearer ' + token);
  return token;
}

const signout = () =>
  headers.delete('Authorization');

const catchRequestsErrors = (error) => {
  if (error.error) {
    let handle = errorHandles[error.code];
    if (handle) {
      handle(error);
      return;
    }
  }
  return error;
};

 // Parse server response.
const parserResponse = (response) => new Promise((resolve, reject) => {
  // Require 'content-type' in hedaers.
  const contentType = response.headers.get("content-type") ||
    reject({
      code: 'C01',
      error: true,
      message: 'Server Response Error. No Conetnt-Type.'
    });

  // Detect text.
  if (~contentType.indexOf("text/plain"))
    reject({
      code: 'C04',
      error: true,
      message: 'Wrong Content-Type. Expecting: application/json'
    });

  // Parse JSON response.
  if(~contentType.indexOf("application/json"))
    return response.json()
      .then(json => json.error ? reject(json) : resolve(json));

 });

 const verifyToken = (response) => new Promise((resolve, reject) => {
   // Require 'content-type' in hedaers.
   const contentType = response.headers.get("content-type") ||
     reject({
       code: 'C01',
       error: true,
       message: 'Server Response Error. No Conetnt-Type.'
     });

  // Detect if token is coorect.
   if (~contentType.indexOf("text/plain"))
     response.text().then(token => jwtDecode(token) ? resolve(token) :
     reject({
       code: 'C02',
       error: true,
       message: 'Incorrect token format'
     }));
   else
     reject({
       code: 'C03',
       error: true,
       message: 'Wrong Content-Type. Expecting: text/plain'
     });
});

 const authorize = (login, password) =>
   fetch(API_Endpoint + `login/${login}/${password}`, config())
    .then(verifyToken)
    .then(signin)
    .catch(catchRequestsErrors);

// Register error calback
const onError = (code, callback) => {
  errorHandles[code] = callback;
};


// ---- AUNLIC API -------------------

const client = {
  authorize, signin, signout, onError,

  get: {
    modules () {
      return callAPI(`get-modules`, config());
    },

    module (id) {
      return callAPI(`get-module/${id}`, config());
    },

    test () {
      return callAPI(`test`, config());
    },

    mock4 () {
      return fetch('http://localhost/projects/cnx-bridge/trash/simple.json', config())
      .then(response => parserResponse(response))
      .catch(catchRequestsErrors);
    },

    mock () {
      return fetch('http://wludwin.linuxpl.info/cdn/simple.json', config())
      .then(response => parserResponse(response))
      .catch(catchRequestsErrors);
    },

    mock2 () {
      return fetch('http://localhost/projects/cnx-bridge/trash/update.json', config())
      .then(response => parserResponse(response))
      .catch(catchRequestsErrors);
    },

    mock3 () {
      return fetch('http://localhost/projects/cnx-bridge/trash/test.json', config())
      .then(response => parserResponse(response))
      .catch(catchRequestsErrors);
    },

    clear (id) {
      return callAPI('clear-module/' + id, config());
    }

  },

  set: {
    module(json) {
      return sendJsonData(`save-module/`, json);
    }
  }
};

export default client;
