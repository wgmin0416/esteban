import React from 'react';
import { RecoilRoot } from 'recoil';
import Header from './components/header/header'
import Body from './components/body/body';
import Bottom from './components/bottom/bottom';

function App() {
    return (
        <RecoilRoot>
            <div>
                <Header />
                <Body />
                <Bottom />
            </div>
        </RecoilRoot>
    );
}

export default App;