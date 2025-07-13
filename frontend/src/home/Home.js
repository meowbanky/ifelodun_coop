import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import CountUp from 'react-countup';
import { FaClock, FaArrowRight } from 'react-icons/fa';
import { FaPiggyBank, FaChartLine, FaHandHoldingUsd, FaShoppingCart, FaWarehouse, FaBuilding } from 'react-icons/fa';

import image1 from '../assets/images/slide1.jpg'; // Ensure the path is correct
import image2 from '../assets/images/slide2.jpg'; // Ensure the path is correct
import image3 from '../assets/images/slide3.jpg'; // Ensure the path is correct

import president from '../assets/images/president.jpg';
import treasurer from '../assets/images/treasurer.jpg';
import placeholder from '../assets/images/placeholder.png'
// import secretary from '../assets/images/secretary.jpg';


import testimonial1 from '../assets/images/testimonial1.jpg';
import testimonial2 from '../assets/images/testimonial2.jpg';
import testimonial3 from '../assets/images/testimonial3.jpg'


const Home = () => {
    const [selectedProfile, setSelectedProfile] = useState(null);

    // Sample data for current executives, staff, past executives, and testimonials
    const currentExecutives = [
        { id: 1, name: 'Mr. Akinleye Abiodun', role: 'Chairman', image: president, bio: 'Mr. Akinleye has been leading the society with a vision for growth and community development.' },
        { id: 2, name: 'Scretary', role: 'Secretary', image: placeholder, bio: 'Jane ensures smooth administrative operations and member engagement.' },
        { id: 3, name: 'Okoya Gbemi', role: 'Treasurer', image: treasurer, bio: 'Mrs. Okoya manages the society’s finances and investments with expertise.' },
    ];

    const staff = [
        { id: 1, name: 'Alice Johnson', role: 'Manager', image: placeholder, bio: 'Alice oversees daily operations and ensures member satisfaction.' },
        { id: 2, name: 'David Williams', role: 'Accountant', image: placeholder, bio: 'David handles all accounting operations and financial reporting.' },
        { id: 3, name: 'Sarah Lee', role: 'Loan Officer', image: placeholder, bio: 'Sarah assists members with loan applications and financial planning.' },
    ];

    const pastExecutives = [
        { id: 1, name: 'Emma Watson', role: 'Former Chairman', image: placeholder, bio: 'Emma served as chairman from 2010 to 2015 and initiated key community projects.' },
        { id: 2, name: 'James Carter', role: 'Former Secretary', image: placeholder, bio: 'James was responsible for administrative operations and member relations.' },
        { id: 3, name: 'Olivia Green', role: 'Former Treasurer', image: placeholder, bio: 'Olivia managed the society’s finances and investments during her tenure.' },
    ];

    const testimonials = [
        {
            id: 1,
            name: 'Mrs. Yakubu',
            quote: 'Joining this cooperative society was the best decision I ever made. The financial support has helped me grow my business.',
            image: testimonial1,
        },
        {
            id: 2,
            name: 'Cynthia',
            quote: 'The savings and investment plans are fantastic. I’ve seen my money grow steadily over the years.',
            image: testimonial2,
        },
        {
            id: 3,
            name: 'Bamidele',
            quote: 'The cooperative society has been a great support system for me and my family. I highly recommend it.',
            image: testimonial3,
        },
    ];

    const openProfile = (profile) => {
        setSelectedProfile(profile);
    };

    const closeProfile = () => {
        setSelectedProfile(null);
    };

    return (
        <div className="bg-blue-50 min-h-screen">
            {/* Hero Section with Slider */}
            <div className="relative">
                <Swiper
                    spaceBetween={30}
                    centeredSlides={true}
                    loop={true}
                    speed={1000}
                    autoplay={{
                        delay: 5000,
                        disableOnInteraction: false,
                    }}
                    pagination={{
                        clickable: true,
                    }}
                    navigation={true}
                    modules={[Autoplay, Pagination, Navigation]}
                    className="mySwiper"
                >
                    <SwiperSlide>
                        <div
                            className="h-[500px] bg-cover bg-center flex items-center justify-center"
                            style={{backgroundImage: `url(${image1})`}} // Inline style for dynamic image
                        >
                            <div className="text-center">
                                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Welcome to Our
                                    Cooperative Society</h1>
                                <p className="text-lg md:text-xl text-white">Empowering members through collective
                                    efforts and shared resources.</p>
                            </div>
                        </div>
                    </SwiperSlide>
                    <SwiperSlide>
                        <div
                            className="h-[500px] bg-cover bg-center flex items-center justify-center"
                            style={{backgroundImage: `url(${image2})`}} // Inline style for dynamic image
                        >
                            <div className="text-center">
                                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Join Us Today</h1>
                                <p className="text-lg md:text-xl text-white">Become a member and enjoy exclusive
                                    benefits.</p>
                            </div>
                        </div>
                    </SwiperSlide>
                    <SwiperSlide>
                        <div
                            className="h-[500px] bg-cover bg-center flex items-center justify-center"
                            style={{backgroundImage: `url(${image3})`}} // Inline style for dynamic image
                        >
                            <div className="text-center">
                                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Community
                                    Development</h1>
                                <p className="text-lg md:text-xl text-white">We work together to build a better
                                    future.</p>
                            </div>
                        </div>
                    </SwiperSlide>
                </Swiper>
            </div>

            {/* Features Section */}
            <div className="container mx-auto py-16 px-4">
                <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Our Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                        <h3 className="text-xl font-bold text-blue-900 mb-4">Financial Assistance</h3>
                        <p className="text-blue-700">We provide loans and financial support to help our members achieve
                            their goals.</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                        <h3 className="text-xl font-bold text-blue-900 mb-4">Savings & Investments</h3>
                        <p className="text-blue-700">Grow your savings with our secure and profitable investment
                            plans.</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                        <h3 className="text-xl font-bold text-blue-900 mb-4">Community Development</h3>
                        <p className="text-blue-700">We work together to improve our community and create a better
                            future.</p>
                    </div>
                </div>
            </div>

            {/* Counter Section */}
            <div className="bg-blue-600 text-white py-8 px-4">
                <div className="container mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-8">Our Achievements</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="mb-6 sm:mb-0">
                            <h3 className="text-3xl font-bold">
                                <CountUp end={13000000} duration={5}/>+
                            </h3>
                            <p className="text-lg">Loans Disbursed</p>
                        </div>
                        <div className="mb-6 sm:mb-0">
                            <h3 className="text-3xl font-bold">
                                <CountUp end={931000000} duration={5}/>+
                            </h3>
                            <p className="text-lg">Total Shares</p>
                        </div>
                        <div className="mb-6 sm:mb-0">
                            <h3 className="text-3xl font-bold">
                                <CountUp end={90000000} duration={5}/>+
                            </h3>
                            <p className="text-lg">Total Savings</p>
                        </div>
                        <div className="mb-6 sm:mb-0">
                            <h3 className="text-3xl font-bold">
                                <CountUp end={900} duration={5}/>+
                            </h3>
                            <p className="text-lg">Total Members</p>
                        </div>
                    </div>
                </div>
            </div>


            {/* Our Services Section */}
            <div className="bg-white py-12 px-4">
                <div className="container mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-12">Our Services</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
                        {/* Thrift Collection */}
                        <div className="p-6 bg-blue-50 rounded-lg shadow-md">
                            <FaPiggyBank className="text-4xl text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Thrift Collection</h3>
                            <p className="text-gray-600">At our cooperative society, we foster a strong savings culture that empowers members to grow their wealth. Through our structured monthly savings program, you develop disciplined financial habits while steadily building your personal financial safety net. Each contribution is a step towards securing your dreams and ensuring a stable future."</p>
                        </div>

                        {/* Financial Advisory */}
                        <div className="p-6 bg-blue-50 rounded-lg shadow-md">
                            <FaChartLine className="text-4xl text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Financial Advisory</h3>
                            <p className="text-gray-600">Our expert Financial Advisory Services equip members with strategic insights for success. From detailed investment appraisals and comprehensive feasibility studies to tailored business plans, our professional team guides you in making informed financial decisions that drive growth and maximize returns.</p>
                        </div>

                        {/* Short Term Loans */}
                        <div className="p-6 bg-blue-50 rounded-lg shadow-md">
                            <FaHandHoldingUsd className="text-4xl text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Short Term Loans</h3>
                            <p className="text-gray-600">Access affordable financing through our member-focused loan program. We offer competitive short-term loans with low interest rates and flexible repayment options designed to support your immediate financial needs. Our streamlined process and favorable terms ensure you can get the funds you need without the burden of excessive costs.</p>
                        </div>

                        {/* Goods and Services */}
                        <div className="p-6 bg-blue-50 rounded-lg shadow-md">
                            <FaShoppingCart className="text-4xl text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Goods and Services</h3>
                            <p className="text-gray-600">Experience our well-stocked marketplace offering quality consumer and household essentials at competitive prices. As a member, you enjoy priority access to our carefully curated selection of consumer and producer goods. We maintain fair pricing to ensure both members and the wider community can access quality products at reasonable rates.</p>
                        </div>

                        {/* Warehouse Facilities */}
                        <div className="p-6 bg-blue-50 rounded-lg shadow-md">
                            <FaWarehouse className="text-4xl text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Warehouse Facilities</h3>
                            <p className="text-gray-600">Access our modern storage solutions featuring state-of-the-art warehouses and cold room facilities. Whether you're storing consumer goods or agricultural produce, our well-maintained storage spaces ensure optimal preservation. We offer flexible rental options for businesses and individuals seeking reliable storage solutions, with preferential rates for members.</p>
                        </div>

                        {/* Real Estates */}
                        <div className="p-6 bg-blue-50 rounded-lg shadow-md">
                            <FaBuilding className="text-4xl text-blue-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Real Estates</h3>
                            <p className="text-gray-600">Unlock premium real estate opportunities through our strategic property investment initiatives. We develop and acquire high-value residential and commercial properties, offering our members priority access to exclusive housing developments. Our comprehensive real estate portfolio provides both investment opportunities and practical housing solutions, ensuring our members can build wealth through property ownership.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Testimonial Section */}
            <div className="container mx-auto py-16 px-4">
                <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">What Our Members Say</h2>
                <Swiper
                    spaceBetween={30}
                    centeredSlides={true}
                    loop={true}
                    speed={1000}
                    autoplay={{
                        delay: 5000,
                        disableOnInteraction: false,
                    }}
                    pagination={{
                        clickable: true,
                    }}
                    navigation={true}
                    modules={[Autoplay, Pagination, Navigation]}
                    className="mySwiper"
                >
                    {testimonials.map((testimonial) => (
                        <SwiperSlide key={testimonial.id}>
                            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                                <img
                                    src={testimonial.image}
                                    alt={testimonial.name}
                                    className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                                />
                                <p className="text-blue-700 mb-4">"{testimonial.quote}"</p>
                                <h3 className="text-xl font-bold text-blue-900">{testimonial.name}</h3>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>

            {/* Current Executives Section */}
            <div className="container mx-auto py-16 px-4">
                <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Current Executives</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {currentExecutives.map((executive) => (
                        <div
                            key={executive.id}
                            className="bg-white p-6 rounded-lg shadow-lg text-center cursor-pointer hover:shadow-xl transition-shadow"
                            onClick={() => openProfile(executive)}
                        >
                            <img
                                src={executive.image}
                                alt={executive.name}
                                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                            />
                            <h3 className="text-xl font-bold text-blue-900 mb-2">{executive.name}</h3>
                            <p className="text-blue-700">{executive.role}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Our Staff Section */}
            <div className="container mx-auto py-16 px-4">
                <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Our Staff</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {staff.map((member) => (
                        <div
                            key={member.id}
                            className="bg-white p-6 rounded-lg shadow-lg text-center cursor-pointer hover:shadow-xl transition-shadow"
                            onClick={() => openProfile(member)}
                        >
                            <img
                                src={member.image}
                                alt={member.name}
                                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                            />
                            <h3 className="text-xl font-bold text-blue-900 mb-2">{member.name}</h3>
                            <p className="text-blue-700">{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Past Executives Section */}
            <div className="bg-blue-100 py-16 px-4">
                <div className="container mx-auto">
                    <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Past Executives</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {pastExecutives.map((executive) => (
                            <div
                                key={executive.id}
                                className="bg-white p-6 rounded-lg shadow-lg text-center cursor-pointer hover:shadow-xl transition-shadow"
                                onClick={() => openProfile(executive)}
                            >
                                <img
                                    src={executive.image}
                                    alt={executive.name}
                                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                                />
                                <h3 className="text-xl font-bold text-blue-900 mb-2">{executive.name}</h3>
                                <p className="text-blue-700">{executive.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile App Download Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4">Download Our Mobile App</h3>
                    <div className="space-y-4">
                        <a href="https://www.emmaggi.com/coop_admin/download.html" className="flex items-center gap-4 text-blue-600 hover:text-blue-700">
                            <FaArrowRight className="w-5 h-5"/>
                            <span>Download for Android</span>
                        </a>
                        <a href="https://oouth-coop.web.app/" className="flex items-center gap-4 text-blue-600 hover:text-blue-700">
                            <FaArrowRight className="w-5 h-5"/>
                            <span>Download for iOS</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Latest News Section */}
            <div className="bg-gray-100">
                <div className="container mx-auto px-4 py-16">
                    <h2 className="text-3xl font-bold text-center mb-12">Latest News</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-lg shadow-md">
                            <div className="flex items-center gap-4">
                                <FaClock className="w-5 h-5 text-blue-600"/>
                                <p>Annual General Meeting - December 15th</p>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-lg shadow-md">
                            <div className="flex items-center gap-4">
                                <FaClock className="w-5 h-5 text-blue-600"/>
                                <p>New Mobile Banking Features Available</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                        <img
                            src={selectedProfile.image}
                            alt={selectedProfile.name}
                            className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                        />
                        <h3 className="text-2xl font-bold text-blue-900 mb-2">{selectedProfile.name}</h3>
                        <p className="text-blue-700 mb-4">{selectedProfile.role}</p>
                        <p className="text-blue-700">{selectedProfile.bio}</p>
                        <button
                            onClick={closeProfile}
                            className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;