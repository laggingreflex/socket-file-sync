import h from 'preact-hyperscript-h';
import { Component } from 'preact';
import fetch from 'fetch-json-simple';
import setStateLoading from 'set-state-loading';
import linkState from 'linkstate';

setStateLoading.rejectIfDataContainsError = true;

export default class Auth extends Component {
  async onsubmit() {
    const res = await setStateLoading.call(this, () => fetch('/auth', {
      body: { secret: this.state.secret }
    }));
    this.props.onAuth(token);
  }
  render() {
    return h.div([
      h.h1('Authenticate'),
      h.form({ onsubmit: e => (e.preventDefault(), this.onsubmit()) }, [
        this.state.error && h.pre(this.state.error.message),
        h.input({
          placeholder: 'Enter the secret',
          onchange: linkState(this, 'secret'),
          disabled: this.state.loading,
        }),
        h.button('Enter', { disabled: this.state.loading }),
      ])
    ]);
  }
}
