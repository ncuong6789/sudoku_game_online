local composer = require( "composer" )
local scene = composer.newScene()
local widget = require( "widget" )
local utility = require( "utility" )


local params

local myData

local function handlePlayButtonEvent( e )
    if e.name == "touch" and e.phase =="ended" then
        local function onComplete( event )
            if ( event.action == "clicked" ) then
                local i = event.index
                if ( i == 1 ) then
                    composer.gotoScene( "scenes.demo", { time = 250, effect = "fade" } )
                elseif ( i == 2 ) then
                    local myData = utility.loadTable("myData.json")
                    myData.saveGame.matrix = nil
                    myData.saveGame.level = 1
                    utility.saveTable(myData,"myData.json")

                    composer.gotoScene( "scenes.demo", { time = 250, effect = "fade" } )
                end
            end
        end

        local alert = native.showAlert( "Onet connect pokemon", "Do you want to continue?", { "Continue", "New Game" }, onComplete )    
    end
end

local function handlequitButtonEvent( event )
    native.requestExit( )
end

local function handleThemesButtonEvent( e )
    if e.name == "touch" and e.phase =="ended" then
        composer.gotoScene( "scenes.themeselect", { time = 250, effect = "fade" } )
    end
end

local function handleHighscoreButtonEvent( e )
    if e.name == "touch" and e.phase =="ended" then
        composer.gotoScene( "scenes.highscore", { time = 250, effect = "fade" } )
    end
end

local function handleGuideButtonEvent( e )
    if e.name == "touch" and e.phase =="ended" then
        composer.gotoScene( "scenes.help", { time = 250, effect = "fade" } )
    end
end

--
-- Start the composer event handlers
--
function scene:create( event )
    local sceneGroup = self.view

    params = event.params
        
    --
    -- setup a page background, really not that important though composer
    -- crashes out if there isn't a display object in the view.
    --
    local background = display.newRect( 0, 0, 570, 360 )
    background.x = display.contentCenterX
    background.y = display.contentCenterY
    sceneGroup:insert( background )

    local title = display.newText("Game Pikachu", 100, 32, native.systemFontBold, 32 )
    title.x = display.contentCenterX
    title.y = 40
    title:setFillColor( 0 )
    sceneGroup:insert( title )

    -- Create the widget
    local playButton = widget.newButton({
        id = "button1",
        label = "Play",
        width = 100,
        height = 32,
        onEvent = handlePlayButtonEvent
    })
    playButton.x = display.contentCenterX
    playButton.y = display.contentCenterY - 70
    sceneGroup:insert( playButton )

    -- Create the widget
    local settingsButton = widget.newButton({
        id = "button2",
        label = "Themes",
        width = 100,
        height = 32,
        onEvent = handleThemesButtonEvent
    })
    settingsButton.x = display.contentCenterX
    settingsButton.y = display.contentCenterY - 30
    sceneGroup:insert( settingsButton )

    -- Create the widget
    local helpButton = widget.newButton({
        id = "button3",
        label = "Help",
        width = 100,
        height = 32,
        onEvent = handleGuideButtonEvent
    })
    helpButton.x = display.contentCenterX
    helpButton.y = display.contentCenterY + 10
    sceneGroup:insert( helpButton )

    -- Create the widget
    local helpButton = widget.newButton({
        id = "button4",
        label = "High Score",
        width = 100,
        height = 32,
        onEvent = handleHighscoreButtonEvent
    })
    helpButton.x = display.contentCenterX
    helpButton.y = display.contentCenterY + 50
    sceneGroup:insert( helpButton )

    -- Create the widget
    local quitButton = widget.newButton({
        id = "button5",
        label = "Quit",
        width = 100,
        height = 32,
        onEvent = handlequitButtonEvent
    })
    quitButton.x = display.contentCenterX
    quitButton.y = display.contentCenterY + 90
    sceneGroup:insert( quitButton )

end

function scene:show( event )
    local sceneGroup = self.view

    params = event.params
    utility.print_r(event)

    if params then
        print(params.someKey)
        print(params.someOtherKey)
    end

    if event.phase == "did" then
        print "remove game scene"
        composer.removeScene( "scenes.demo" ) 
    end
end

function scene:hide( event )
    local sceneGroup = self.view
    
    if event.phase == "will" then
    end

end

function scene:destroy( event )
    local sceneGroup = self.view
end

---------------------------------------------------------------------------------
-- END OF YOUR IMPLEMENTATION
---------------------------------------------------------------------------------
scene:addEventListener( "create", scene )
scene:addEventListener( "show", scene )
scene:addEventListener( "hide", scene )
scene:addEventListener( "destroy", scene )
return scene




