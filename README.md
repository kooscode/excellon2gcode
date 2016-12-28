# excellon2gcode
<strong>NOTES</strong><br/>
</br>
** Download the repo as ZIP.. then follow install instructions below.</br>
** This has only been tested on Tormach CNC machines running Path Pilot, but its a canned drill cycle, so it should work fine on other machines.</br>
** Spindle speed is fixed at 10k RPM for now, but you can change it in the .js file.. same with a few other presets..</br>
</br>
<strong>INSTALL INSTRUCTIONS:</strong></br>
</br>
Install Node.js from http://nodejs.org </br>
</br>
Install the "command" and "clear" required node modules in the repo directory:</br>
  <pre>npm install --save command</pre></br>
 <pre>npm install --save clear</pre></br>
  </br>
Install "e2g" as a CLI command:</br>
  <pre>npm install -g</pre></br>
  </br>
 <strong>USAGE:</strong></br>
  <pre>e2g [excellon-filename]</pre></br>
 
