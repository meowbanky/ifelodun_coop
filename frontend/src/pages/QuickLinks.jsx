import { Link } from 'react-router-dom'; // Import the Link component

const QuickLinks = () => {
    return (
        <div>
            <div className="space-y-4">
                <Link to="/About" className="block text-gray-300 hover:text-blue-600">About Us</Link>
                <Link to="/Services" className="block text-gray-300 hover:text-blue-600">Services</Link>
                <Link to="/Contact" className="block text-gray-300 hover:text-blue-600">Contact</Link>
            </div>
        </div>
    );
};

export default QuickLinks;