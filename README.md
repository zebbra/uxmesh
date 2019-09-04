# uxmesh

## summary
to 

### features
#### the client
+ etablishs a connection to the server, to retreive a list of all clients in the network
+ connects to each client in the network directly with webRTC
+ can be executed as a docker container on a device or as client-side-code in the browser
#### the server
+ the server to agregate data received from clients



## setup and run client
### for command line execution
prerequisites:
--> install node in version 10.x or higher
```
brew install node
```
```
npm install
```

#### run the client on the command line
with debug output:
```
DEBUG=* npm run server
```
regular:
```
npm run server
```

#### run the client in the browser

type in your browser: `your-domain-of-your-uxmesh-server/clientworker.html`
default is `http://localhost:3001` 

### for deployments with docker

the docker image contains `apt-get` calls to install `tcpdump` and `net-tools` to provide some network analysis inside the running docker container.
further the image is built with the `node:10` base image, which provides some native debian commands inside the container during runtime.

#### create the docker image for the client
```
docker build -f Dockerfile.client  -t uxmesh:0.12-client .
```

#### run the server
with debug output:
```
DEBUG=* npm run client
```
regular:
```
npm run client
```
use optional parameter to set uxmesh-server address (default is http://localhost:3001):
```
npm run client http://uxmeshserver.your-domain.com
```

#### run the client on the command line

with debug output:
```
DEBUG=* npm run server
```
regular:
```
npm run server
```



open browser http://localhost:3000

##### additional resources stuff:

  * chrome://webrtc-internals/
  * https://github.com/feross/simple-peer (see perf dir for simple perfomance test example)
  * https://d3js.org/
  * https://gist.github.com/d9bf021c395835427aa0.git

Possible animations to vizualize the data:

  * https://jaumereg.github.io/d3-viz-animated-chord-diagram/
  * https://guyabel.com/post/animated-directional-chord-diagrams/
  * https://flowingdata.com/2015/12/15/a-day-in-the-life-of-americans/
  * https://mimno.github.io/showcase/project2/got/
