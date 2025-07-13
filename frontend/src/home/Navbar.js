import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logos/logo.png';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className="bg-blue-600 p-4 text-white">
            <div className="container mx-auto flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="text-2xl font-bold flex items-center">
                    <img
                        src={logo}
                        alt="Logo"
                        className="w-10 h-10 mr-2"
                    />
                    OOUTH Cooperative Society
                </Link>

                {/* Hamburger Menu for Mobile */}
                <div className="md:hidden">
                    <button onClick={toggleMenu} className="text-white focus:outline-none">
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 6h16M4 12h16m-7 6h7"
                            ></path>
                        </svg>
                    </button>
                </div>

                {/* Desktop Menu */}
                <ul className="hidden md:flex space-x-4">
                    <li>
                        <Link to="/" className="hover:text-blue-300">Home</Link>
                    </li>
                    <li>
                        <Link to="/about" className="hover:text-blue-300">About</Link>
                    </li>
                    <li>
                        <Link to="/services" className="hover:text-blue-300">Services</Link>
                    </li>
                    <li>
                        <Link to="/contact" className="hover:text-blue-300">Contact</Link>
                    </li>
                </ul>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden mt-4">
                    <ul className="flex flex-col space-y-2">
                        <li>
                            <Link to="/" className="block hover:text-blue-300">Home</Link>
                        </li>
                        <li>
                            <Link to="/about" className="block hover:text-blue-300">About</Link>
                        </li>
                        <li>
                            <Link to="/services" className="block hover:text-blue-300">Services</Link>
                        </li>
                        <li>
                            <Link to="/contact" className="block hover:text-blue-300">Contact</Link>
                        </li>
                    </ul>
                </div>
            )}
        </nav>
    );
};

export default Navbar;