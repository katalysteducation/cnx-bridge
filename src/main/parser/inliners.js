// Helpers for parsing tags defined in 'rules' object.

export default function inlineRules () {
  let counter = 0;
  const inlineStore = {};

  // General transformation.
  const passThrough = (value, content) => {
    counter++;
    inlineStore[counter] = value;
    return `#%${counter}%#`;
  };

  // Interface.
  return {
    // Hash table.
    store: inlineStore,

    // Mini tag's parsers.
    rules: {

      image (value, content) {
        counter++;
        inlineStore[counter] = `<img${value.slice(value.indexOf(' '), value.indexOf('>'))}/>`;
        return `#%${counter}%#`;
      },

      link (value, content) {
        counter++;
        inlineStore[counter] = value.replace(/link/g, 'ref');
        return `#%${counter}%#`;
      },

      sub: passThrough,
      sup: passThrough,
      term: passThrough,
      math: passThrough,
      quote: passThrough,
      newline: passThrough,
      emphasis: passThrough,
      footnote: passThrough,
    }
  }
};
