const h = require('preact-hyperscript-h');
const render = require('preact-render-to-string');

module.exports = render(h.html([
  h.head([
    h.title('Socket File Sync'),
  ]),
  h.body([
    h.script({ src: 'app.js' })
  ]),
]));
