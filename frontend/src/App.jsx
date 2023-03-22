import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import Header from './components/header/header'
import Body from './components/body/body';
import Bottom from './components/bottom/bottom';

function App() {
    return (
        <RecoilRoot>
            <Router>
                <Header />
                {/*<Switch>*/}
                    <Router path="/" exact component={Body}/>
                    {/*다른 라우트 추가 가능*/}
                {/*</Switch>*/}
                <Bottom />
            </Router>
        </RecoilRoot>
    );
}

export default App;