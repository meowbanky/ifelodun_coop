import React from 'react';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import QuickLinks from './QuickLinks'; // Correct import path

const Footer = () => {
    return (
        <footer className="bg-gray-800 text-white py-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Contact Information */}
                    <div>
                        <h3 className="text-xl font-bold mb-4">Contact Us</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <FaPhone className="w-6 h-6 text-blue-600" />
                                <div>
                                    <p className="font-semibold">Phone</p>
                                    <p className="text-gray-300">+234 803 749 5479</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <FaEnvelope className="w-6 h-6 text-blue-600" />
                                <div>
                                    <p className="font-semibold">Email</p>
                                    <p className="text-gray-300">info@oouthcoop.com</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <FaMapMarkerAlt className="w-6 h-6 text-blue-600" />
                                <div>
                                    <p className="font-semibold">Address</p>
                                    <p className="text-gray-300">OOUTH Complex, Sagamu, Ogun State</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <FaClock className="w-6 h-6 text-blue-600" />
                                <div>
                                    <p className="font-semibold">Operating Hours</p>
                                    <p className="text-gray-300">8:00 AM - 4:00PM</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-xl font-bold mb-4">Quick Links</h3>
                         <QuickLinks/>
                    </div>

                    {/* Social Media Links */}
                    <div>
                    <h3 className="text-xl font-bold mb-4">Follow Us</h3>
                        <div className="space-y-4">
                            <a href="#" className="block text-gray-300 hover:text-blue-600">Facebook</a>
                            <a href="#" className="block text-gray-300 hover:text-blue-600">Twitter</a>
                            <a href="#" className="block text-gray-300 hover:text-blue-600">Instagram</a>
                        </div>
                    </div>
                </div>

                {/* Copyright Notice */}
                <div className="text-center mt-8">
                    <p className="text-gray-300">&copy; 2024 OOUTH Cooperative Society. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;