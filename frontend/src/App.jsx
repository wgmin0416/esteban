import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import Header from "./components/header/header";
import Body from "./components/body/body";
import Bottom from "./components/bottom/bottom";
import MemberManagement from "./components/MemberManagement.jsx";
import TeamManagement from "./components/TeamManagement.jsx";

function App() {
  return (
      <Router>
          <div>
              <Header />
              <Switch>
                  <Route path="/body" component={Body} />
                  <Route path="/member" component={MemberManagement} />
                  <Route path="/team" component={TeamManagement} />
              </Switch>
              <Bottom />
          </div>
      </Router>
  );
}

export default App;
