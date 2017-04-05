// Helpers for parsing tags defined in 'rules' object.

export default function inlineRules () {
  let counter = 0;
  const inlineStore = {};

  return {
    // hash table.
    store: inlineStore,

    // Mini tag's parsers.
    rules: {

      image (value, content) {
        counter++;
        inlineStore[counter] = `<img${value.slice(value.indexOf(' '), value.indexOf('>'))}/>`;
        return `#%${counter}%#`;
      },

      quote (value, content) {
        counter++;
        inlineStore[counter] = value.replace(/<quote/g, '<quote contenteditable="false"');
        return `#%${counter}%#`;
      },

      math (value, content) {
        counter++;
        inlineStore[counter] = value;
        return `#%${counter}%#`;
      },

      link (value, content) {
        counter++;
        inlineStore[counter] = value.replace(/link/g, 'ref');
        return `#%${counter}%#`;
      },

      emphasis (value, content) {
        counter++;
        inlineStore[counter] = value;
        return `#%${counter}%#`;
      },

      term (value, content) {
        counter++;
        inlineStore[counter] = value;
        return `#%${counter}%#`;
      },

      newline (value, content) {
        counter++;
        inlineStore[counter] = value;
        return `#%${counter}%#`;
      }
    }
  }
};
