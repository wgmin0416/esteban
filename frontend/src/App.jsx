import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.scss'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Header from './components/Header.jsx';
import Body from './components/Body.jsx';
import Footer from './components/Footer.jsx';
import MemberManagement from './components/MemberManagement.jsx';
import TeamManagement from './components/TeamManagement.jsx';

function App() {
    return (
        <Router>
            <Header />
            <Body>
                <Switch>
                    <Route path="/members" component={MemberManagement} />
                    <Route path="/teams" component={TeamManagement} />
                </Switch>
            </Body>
            <Footer />
        </Router>
    );
}

export default App
