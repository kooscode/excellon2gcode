#!/usr/bin/env node

var pjson = require('./package.json');
var program = require('commander');
var clear = require('clear');

clear();
console.log('==== ' + pjson.description + ' ====');
console.log('Version: ' + pjson.version + '\n');
console.log('\tFor instructions use e2g --help\n');

//place holders for future command line options 
var spindleSpeed = 10000;
var feedRate = 10;
var zSafeHeight = 0.6;
var zFeedHeight = 0.2;
var zHoleBottom = -0.0725;

//General vars..
var inHeader = false;
var toolNumber = 0;
var newDrillCycle = false;

var fs = require('fs');
var readline = require('readline');

var lineNumber = 0;
var drillfile = process.argv[2];
var gcodefile = drillfile + '-gcode.nc';

var gcodecontent = '';

// util functions to the string object
String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
}

//all supported non-numeric letters for finding Codes/Values
var codeLetters = "[ABCDFGHHIJKLMNOPQRSTXYZ,\(\[]";  

//helper to parse a code value after a code letter
var parseCodeValue = function(codeline)
{
    var retcode = codeline.trim().toUpperCase();    
    var endcode = codeline.substr(1, codeline.length-1).search(codeLetters);
    
    endcode = (endcode > 0)?endcode:codeline.length-1;
    
    retcode = codeline.substr(1, endcode); 

    return retcode;
}

//Small Helper function to generate GCode line numbers
function lnum()
{
    lineNumber += 10;
    return 'N' + lineNumber + ' ';
}

//Function to pare EXCELLON code line by line..
function lineParser(linedata)
{
    var outline = '';
    
    var gcode = '';
    linedata = linedata.trim();
    if (linedata != '')
    {
        var codeLetter = linedata.substr(0,1);
        
        switch (codeLetter)
        {
            case '%':
                    inHeader = false; //Exit Header
                break;
            case 'M':
                var mcode = parseInt(parseCodeValue(linedata));
               
                switch (mcode)
                {
                    case (30):
                        outline = '\n( --------- PROGRAM END --------- )\n';
                        outline += lnum() + 'M5 (Spindle Stop)\n';
                        outline += lnum() + 'M9 (Coolant Off)\n';
                        outline += lnum() + 'G30 (Go Home)\n';
                        outline += lnum() + 'M30 (END)\n';
                        break;
                    case (48):
                        inHeader = true; //"in header mode"
                        outline = '( --------------------------------------------------------)\n';
                        outline += '( -- EXCELLON TO GCODE CONVERTER - kdupreez@hotmail.com --)\n';
                        outline += '( --------------------------------------------------------)\n';
                        outline += lnum() + 'G90 G54 G64 G50 G17 G40 G80 G94 G91.1 G49\n';
                        outline += lnum() + 'G30\n';
                        
                        console.log('\tGenerating GCode Header...');

                        break;
                    case (71): //M71 = METRIC 
                        outline = lnum() + 'G21 (METRIC)\n\n';
                        console.log('\tSetting units to Metric (mm)...');
                        break;
                    case (72): //M72 = INCHES
                        outline = lnum() + 'G20 (INCHES)\n\n';
                        console.log('\tSetting units to Inches...');
                        break;
                    default:
                        outline = '(-- Unknown MCode: ' + linedata + ')\n';
                }
                break;
            case 'T':
                if (!inHeader)
                {
                    toolNumber = parseInt(parseCodeValue(linedata));
                    outline = '\n( --------- DRILL T' + toolNumber + ' --------- )\n';
                    outline += lnum() + 'M5 (Spindle Stop)\n';
                    outline += lnum() + 'M9 (Coolant Off)\n';
                    outline += lnum() + 'G30 (Go Home)\n';
                    outline += lnum() + 'T' + toolNumber + ' G43 H' + toolNumber + ' M6 (Tool Change)\n'; // tool change with offset
                    outline += lnum() + 'S' + spindleSpeed +' M3 (Spindle Start)\n'; //Set Splinde Speed - Forward Rotation
                    outline += lnum() + 'G54\n'; //Work Coordinate System
                    
                    newDrillCycle = true;
                    
                    console.log('\tConverting drill cycle for Tool ' + toolNumber);

                }
                else
                {
                    var strTool = parseCodeValue(linedata);
                    var strDiameter = parseCodeValue(linedata.substr(strTool.length+1));
                    outline = '(T:' + strTool +' Diameter: ' + strDiameter + ' )\n';
                    console.log('\tFound Tool: ' + strTool +' with diameter: ' + strDiameter);

                }
                break;
            case 'X':
            case 'Y':
                if (!inHeader)
                {
                    var strX = parseCodeValue(linedata);
                    var strY = parseCodeValue(linedata.substr(strX.length+1));
                    var fX =  parseInt(strX) / 100000.0;
                    var fY =  parseInt(strY) / 100000.0;
                    
                    if (newDrillCycle)
                    {
                        outline = lnum() + 'G0 X' + fX + ' Y' + fY + '\n';
                        outline += lnum() + 'G0 Z' + zSafeHeight +'\n'; // Feed Height..
                        outline += lnum() + 'G0 Z' + zFeedHeight +'\n'; // Feed Height..
                        //G98: Return to Initial Z plane after canned cycle
                        //G81: Simple drilling cycle
                        //F3.: Feed Rate
                        //Canned cycle retract = 0.2
                        //Canned cycle will retract to R-Plane = 0.2
                        //Hole Bottom: X  Y Z = Hole depth
                        outline += lnum() + 'G98 G81 X' + fX + ' Y' + fY + ' Z' + zHoleBottom + ' R' + zFeedHeight + ' F' + feedRate + '.\n'; 
                        newDrillCycle = false;
                    }
                    else
                    {
                        outline = lnum() + 'X' + fX + ' Y' + fY + '\n';
                    }
                }
                break;
            default:
                    outline = '; Unknown Code: ' + linedata;
            break;
        }
    }

    return outline;
}



// Run program with <file> parameter.. 
program
    .arguments('<file>')
    .action(function(file){
    
        //open file for stream reading
        var fstream = fs.createReadStream(drillfile);
    
        //error reading file..
        fstream.on('error', function(err){
            console.log('ERROR Reading File!');
            console.error('\t' + err.message); 
        });

            
        console.log('>>> Excellon File: ' + drillfile);
        console.log('>>> GCode File: ' + gcodefile);
        console.log('>>> Converting File...');

        //setup readline interface with stream
        var rline = readline.createInterface({input: fstream});

        //handler for every line being read..
        rline.on('line', function(line){

            var fileLine = lineParser(line);
            if (fileLine.length > 0)
            {
                gcodecontent += fileLine;
            }
        });

        //handler for end of file.
        rline.on('close', function(line){
            fs.writeFile(gcodefile, gcodecontent, function(err){
                    if (err)
                    {
                        console.log("\n\ERROR CREATING FILE!");
                        console.error(err); 
                    }
                    else
                    {
                        console.log("\n\nSUCCESS!!\n");
                    }
                });

        });
    
    
    })
    .parse(process.argv);


