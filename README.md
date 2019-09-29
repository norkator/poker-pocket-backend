# Poker Pocket Backend

Nitramite Poker Pocket back end server currently running Texas Hold'em games. It's powering 
Nitramite Poker Pocket game. This back end is pretty light weight and can run thousands of rooms easily. 
Future plans are to support multiple different games.

You are NOT allowed to copy this back end and make your own game. 

### Help required

Reason I shared this code here (see license) is that I want to <b>find someone who wants to 
create Virtual Reality front end</b> with Unity or any other game development platform.
If that is you? you can contact me via email at: nitramite@outlook.com
so that we can discuss our deal, it's okay that who ever does it owns that vr front end 
and also promotes my non VR versions. This way we both MAY be able to make buck out of this. 
That's the goal. Would be super awesome to work with someone together.

I currently have two different front end clients. You may want to take a look at them to 
see what it's all about.

Web UI: https://pokerpocket.nitramite.com/  
Android client: https://play.google.com/store/apps/details?id=com.nitramite.pokerpocket

This web ui can be used for testing this back end. See instructions below.


### Prerequisites
* Download handRanks.dat file from: 
https://github.com/christophschmalhofer/poker/blob/master/XPokerEval/XPokerEval.TwoPlusTwo/HandRanks.dat  
and place it under `app` folder.
* PostgreSQL https://www.postgresql.org/


### Basic setup
1. config.js has all configurations, including database connection properties.
2. Run `npm install`
3. Run `npm run dev` on development environment (uses nodemon)
4. Backend is now running.
5. Open https://pokerpocket.nitramite.com/ and use connection switch set as `dev` to open connection
to localhost web socket.


### Backend & front end communication

To create front end, it's essential to know how communication works. 
Data transmission itself is build on top of web sockets and every message moves with specific `key` name.

I try explain steps in simple way:

1. New connection comes from front end.
2. Web socket is created and `connectionId` is generated which is basically integer with auto increment. 
Also webSocket library generates `socketKey` which is also returned and used for verification of requests from front end.
3. After step 2. front end asks rooms via `getRooms` or `getSpectateRooms` key which is then answered by same key name but result having array of rooms.
4. Front end renders rooms or spectating rooms and then click is handled by sending `selectRoom` or `selectSpectateRoom` key to back end.
5. User is then appended to selected room and back end will send room parameters with key `roomParams` to render view according to state of room.
6. All the other actions like calling, raising, folding, getting stats, login, creating account is only a 
matter of key and parameters needed to call that specific action. I fill more details later but everything is visible at 
code how to do it.


### Note
.gitignore is ignoring HandRanks.dat which is huge file


### Database
Before this project used MySQL NodeJS package but
it's now changed to Sequelize to support multiple database platforms.
See https://github.com/sequelize/sequelize for different connectors. 
This back end come by default with  `pg` and `pg-hstore` for Postgres.


## Authors

* **Martin K.** - *Initial work* - [norkator](https://github.com/norkator)


## License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/4.0/"><img alt="Creative Commons -licene" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png" /></a><br />Licensed with <a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/4.0/">Creative Commons Attribution - NonCommercial - NoDerivatives 4.0 International - license</a>.
