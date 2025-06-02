import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// component
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <Router>
      <Header />
      <AppRoutes />
      <Footer />
    </Router>
  );
}

export default App;
