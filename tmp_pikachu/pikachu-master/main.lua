local composer = require( "composer" )
-- local widget = require( "widget" )
-- local ads = require( "ads" )
-- local store = require( "store" )
-- local gameNetwork = require("gameNetwork")
local utility = require( "utility" )
local myData = require( "mydata" )
-- local device = require( "device" )

display.setStatusBar( display.HiddenStatusBar )

math.randomseed( os.time() )

-- TODO: test this later
--[[
if device.isAndroid then
	widget.setTheme( "widget_theme_android_holo_light" )
    store = require("plugin.google.iap.v3")
end
]]


-- TODO: fix this with your data
-- Load saved in settings
--

local myData = utility.loadTable("myData.json")
--local myData = nil
if myData == nil then
    myData = require("mydata")
    utility.saveTable(myData,"myData.json")
end

--
-- handle system events
--
local function systemEvents(event)
    print("systemEvent " .. event.type)
    if event.type == "applicationSuspend" then
       
    elseif event.type == "applicationResume" then
        -- 
        -- login to gameNetwork code here
        --
    elseif event.type == "applicationExit" then
        
    elseif event.type == "applicationStart" then
        composer.gotoScene( "scenes.menu", { time = 250, effect = "fade" } )
    end
    return true
end

composer.recycleOnSceneChange = true
display.setStatusBar(display.HiddenStatusBar)  
system.activate("multitouch") 

Runtime:addEventListener("system", systemEvents)
