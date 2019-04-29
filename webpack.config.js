const path = require('path');
const WebpackUserscript = require('webpack-userscript');

module.exports = {
    mode: process.env.NODE_ENV,
    entry: path.resolve(__dirname, 'src', 'index.ts'),
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'denjinladder.user.js',
        path: path.resolve(__dirname, 'dist')
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist')
    },
    plugins: [
        new WebpackUserscript({
            headers: path.resolve(__dirname, 'src', 'meta.ts')
        })
    ],
    externals: {
        jquery: 'jQuery'
    }
};
