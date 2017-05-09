import h from 'preact-hyperscript-h';
import md from 'preact-markdown';
import { render, Component } from 'preact';
import Auth from './auth';

class App extends Component {

  componentWillMount() {
    this.checkAuth();
  }

  render() {
    if (!this.state || !this.state.token) {
      return this.renderAuth()
    } else {
      return this.renderApp();
    }
  }

  renderApp() {
    return h.div([
      h.h1('Socket File Sync'),
      md('No connections. Go ahead and do `sfs` on client'),
    ]);
  }

  checkAuth() {
    if (!this.state || !this.state.token) {
      const token = window.sessionStorage.getItem('token');
      if (token) {
        this.setState({ token });
      }
    }
  }

  renderAuth() {
    return h(Auth, {
      onAuth: token => {
        window.sessionStorage.setItem('token', token)
        this.setState({ token });
      }
    });
  }

}

render(h(App), document.body);
