# DeXo CDN [![CodeFactor](https://www.codefactor.io/repository/github/dexohigh/dexocdn/badge)](https://www.codefactor.io/repository/github/dexohigh/dexocdn)

<img src="./public/images/DeXoCDN.png" width="100%">

DeXoCDN is a public, open-source, and simple Content Delivery Network (CDN) designed for use with Node.js. It provides a caching mechanism, monitoring capabilities, and supports MongoDB for storing metadata. DeXoCDN allows developers to easily distribute and serve static assets to improve performance and reduce server load.

## Features

- **Caching**: Dexo CDN offers a robust caching system that helps minimize server load and reduces latency by storing frequently accessed assets closer to the end users.
- **Monitoring**: The CDN includes monitoring features to track CDN performance, analyze traffic patterns.
- **MongoDB**: Dexo CDN supports MongoDB as the underlying database to store metadata related to the cached assets, providing flexibility and scalability.
- **Node.js Compatibility**: The CDN is built specifically for use with Node.js, allowing developers to seamlessly integrate it into their Node.js projects.

## Installation

To use **DeXoCDN** in your Node.js project, follow these steps:

1. Ensure you have Node.js and npm installed on your machine.
2. Clone the Dexo CDN repository from GitHub:

```bash
git clone https://github.com/DeXoHigh/dexocdn.git
```

3. Navigate to the project directory:
```bash
cd dexocdn
```

4. Install the dependencies:
```bash
npm install
```

5. Configure DeXoCDN:
- Update the MongoDB connection details in the configuration file (.env) to point to your MongoDB instance.
- Update the port listening

6. Start the DeXoCDN server:
```bash
npm start
```

## Usage

To use DeXoCDN, upload your files to either the `/public/images` or `/public/js` directories. Once uploaded, you can access them through the following URLs:

- For JavaScript files:
http://localhost:3000/js/[file].js
- For Images:
http://localhost:3000/images/[file].js

```For MongoDB usage, you can access the following URL for a JSON response with detailed information:```
<center>http://localhost:3000/status</center>

##### The JSON response will contain the following details:
```json
{
  "images": [
    {
      "_id": "649e9eb40c739fb48c460602",
      "url": "/images/logo.png",
      "time": 1688116916771,
      "filename": "logo.png",
      "loaded": "3ms",
      "expires": 1719652916774,
      "__v": 0
    }
  ],
  "js": [
    {
      "_id": "649ea176eba41458ad39ef0b",
      "url": "/js/index.js",
      "time": 1688117622829,
      "filename": "index.js",
      "loaded": "6ms",
      "expires": 1719653622835,
      "__v": 0
    }
  ]
}
```
<center> Feel free to customize the URLs and adjust the file paths as needed for your specific setup.</center>

## Contributing

Contributions to DeXoCDN are welcome! If you'd like to contribute, please follow these steps:
1. Fork the repository on GitHub.
2. Create a new branch with a descriptive name for your feature or bug fix.
3. Make the necessary changes and commit them.
4. Push your changes to your forked repository.
5. Submit a pull request to the main DexoCDN repository.

Please ensure that your code adheres to the project's coding standards and includes appropriate tests when necessary.

## License
DeXoCDN is open-source software licensed under the [MIT License].

## Contact
If you have any questions, suggestions, or feedback, please feel free to reach out to us at your-dexo.ovh@gmail.com. <br>
Discord: DeXo#2557
