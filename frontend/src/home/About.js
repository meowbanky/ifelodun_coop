import React from 'react';

const About = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">About Us</h1>
                    <p className="text-xl text-gray-600">
                        Building financial security through cooperation
                    </p>
                </div>

                {/* Mission and Vision Section */}
                <div className="bg-white shadow-lg rounded-lg p-8 mb-8 transform transition-all hover:scale-105 hover:shadow-xl">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
                    <p className="text-gray-600 mb-6">
                        To promote the economic wellbeing of our members through sustainable cooperative practices, providing accessible financial services, and fostering a culture of saving and mutual support within the OOUTH community.
                    </p>

                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Vision</h2>
                    <p className="text-gray-600 mb-6">
                        To be the leading healthcare cooperative society in Ogun State, exemplifying excellence in member service, financial stability, and community impact.
                    </p>
                </div>

                {/* Services and Benefits Section */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Services Card */}
                    <div className="bg-white shadow-lg rounded-lg p-8 transform transition-all hover:scale-105 hover:shadow-xl">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Services</h2>
                        <ul className="space-y-3 text-gray-600">
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Low-interest loans for members
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Competitive savings products
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Investment opportunities
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Emergency financial assistance
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Financial advisory services
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Annual dividends distribution
                            </li>
                        </ul>
                    </div>

                    {/* Benefits Card */}
                    <div className="bg-white shadow-lg rounded-lg p-8 transform transition-all hover:scale-105 hover:shadow-xl">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Member Benefits</h2>
                        <ul className="space-y-3 text-gray-600">
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Access to affordable credit facilities
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Competitive returns on savings
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Financial security through mutual support
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Regular financial education workshops
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Participation in decision-making
                            </li>
                            <li className="flex items-center">
                                <span className="mr-2">•</span> Access to special welfare packages
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Contact Information Section */}
                <div className="bg-white shadow-lg rounded-lg p-8 mt-8 transform transition-all hover:scale-105 hover:shadow-xl">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                    <div className="text-gray-600">
                        <p className="mb-2 flex items-center">
                            <svg
                                className="w-5 h-5 mr-2 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                            Location: OOUTH Complex, Sagamu, Ogun State
                        </p>
                        <p className="mb-2 flex items-center">
                            <svg
                                className="w-5 h-5 mr-2 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                            Email: info@oouthcoop.com
                        </p>
                        <p className="mb-2 flex items-center">
                            <svg
                                className="w-5 h-5 mr-2 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                            </svg>
                            Phone: +234 123 456 7890
                        </p>
                        <p className="flex items-center">
                            <svg
                                className="w-5 h-5 mr-2 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            Operating Hours: Mon - Fri, 8:00 AM - 5:00 PM
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;