import React from 'react';

/**
 * Tailwind CSS Integration Example
 * Demonstrates utility-first CSS with Tailwind in Katalyst
 */
export const TailwindExample: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Tailwind CSS Example
        </h1>
        
        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-500 rounded-full mb-4"></div>
            <h3 className="text-xl font-semibold mb-2">Responsive Design</h3>
            <p className="text-gray-600">
              Build responsive layouts with ease using Tailwind's responsive modifiers.
            </p>
          </div>
          
          {/* Card 2 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-500 rounded-full mb-4"></div>
            <h3 className="text-xl font-semibold mb-2">Utility First</h3>
            <p className="text-gray-600">
              Style elements directly in your markup with utility classes.
            </p>
          </div>
          
          {/* Card 3 */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-500 rounded-full mb-4"></div>
            <h3 className="text-xl font-semibold mb-2">Dark Mode</h3>
            <p className="text-gray-600">
              Easily implement dark mode with Tailwind's dark variant.
            </p>
          </div>
        </div>
        
        {/* Button Examples */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Button Variants</h2>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Primary
            </button>
            <button className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
              Secondary
            </button>
            <button className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-all">
              Outline
            </button>
            <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:from-purple-600 hover:to-pink-600 transition-all">
              Gradient
            </button>
          </div>
        </div>
        
        {/* Form Example */}
        <div className="mt-12 max-w-md">
          <h2 className="text-2xl font-bold mb-4">Form Styling</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Your message..."
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TailwindExample;