import React from 'react';

const Services = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-8">
            <div className="container mx-auto">
                <h1 className="text-5xl font-bold text-blue-900 mb-12 text-center">Our Services</h1>

                {/* Loans Section */}
                <section className="bg-white rounded-lg shadow-lg p-8 mb-8 hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-3xl font-semibold text-blue-800 mb-6">Loans</h2>
                    <ul className="list-disc list-inside text-lg text-blue-700 space-y-2">
                        <li>Personal Loans: Up to ₦5 million with competitive interest rates</li>
                        <li>Emergency Loans: Quick access funds for urgent needs</li>
                        <li>Asset Financing: For vehicles, electronics, and home appliances</li>
                        <li>Project Loans: Support for business ventures and personal projects</li>
                    </ul>
                </section>

                {/* Savings Products Section */}
                <section className="bg-white rounded-lg shadow-lg p-8 mb-8 hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-3xl font-semibold text-blue-800 mb-6">Savings Products</h2>
                    <ul className="list-disc list-inside text-lg text-blue-700 space-y-2">
                        <li>Regular Savings: Earn competitive returns on monthly deposits</li>
                        <li>Target Savings: Goal-oriented savings with higher interest rates</li>
                        <li>Fixed Deposit: Short and long-term investment options</li>
                        <li>Children Education Savings: Secure your child's future</li>
                    </ul>
                </section>

                {/* Investment Plans Section */}
                <section className="bg-white rounded-lg shadow-lg p-8 mb-8 hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-3xl font-semibold text-blue-800 mb-6">Investment Plans</h2>
                    <ul className="list-disc list-inside text-lg text-blue-700 space-y-2">
                        <li>Real Estate Investment Scheme</li>
                        <li>Agricultural Investment Programs</li>
                        <li>Cooperative Investment Trust (CIT)</li>
                        <li>Annual Dividend Programs</li>
                    </ul>
                </section>

                {/* Financial Advisory Section */}
                <section className="bg-white rounded-lg shadow-lg p-8 mb-8 hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-3xl font-semibold text-blue-800 mb-6">Financial Advisory</h2>
                    <ul className="list-disc list-inside text-lg text-blue-700 space-y-2">
                        <li>Personal Financial Planning</li>
                        <li>Investment Consultation</li>
                        <li>Retirement Planning</li>
                        <li>Debt Management Counseling</li>
                    </ul>
                </section>

                {/* Special Programs Section */}
                <section className="bg-white rounded-lg shadow-lg p-8 mb-8 hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-3xl font-semibold text-blue-800 mb-6">Special Programs</h2>
                    <ul className="list-disc list-inside text-lg text-blue-700 space-y-2">
                        <li>End-of-Year Bonus Schemes</li>
                        <li>Festival/Holiday Support Packages</li>
                        <li>Member Welfare Support</li>
                        <li>Professional Development Financing</li>
                    </ul>
                </section>

                {/* Insurance Services Section */}
                <section className="bg-white rounded-lg shadow-lg p-8 mb-8 hover:shadow-xl transition-shadow duration-300">
                    <h2 className="text-3xl font-semibold text-blue-800 mb-6">Insurance Services</h2>
                    <ul className="list-disc list-inside text-lg text-blue-700 space-y-2">
                        <li>Group Life Insurance</li>
                        <li>Health Insurance Plans</li>
                        <li>Asset Insurance</li>
                        <li>Personal Accident Coverage</li>
                    </ul>
                </section>

                {/* Additional Note */}
                <div className="bg-blue-900 rounded-lg p-8 text-center">
                    <p className="text-lg text-white italic">
                        Each service is tailored to meet the unique needs of healthcare professionals, with flexible terms and competitive rates. Members enjoy preferential access and reduced processing times.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Services;