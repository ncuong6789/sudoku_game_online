local composer = require( "composer" )
local scene = composer.newScene()
local utility = require("utility")
local myData
local theme_pokemon,theme_cat,theme_lol
-- -----------------------------------------------------------------------------------
-- Scene event functions
-- -----------------------------------------------------------------------------------

local function handlerBtnOk( e )
     if e.name == "touch" and e.phase == "began" then
        composer.gotoScene( "scenes.menu", { time = 250, effect = "fade" } )
     end
end

-- create()
function scene:create( event )

    local sceneGroup = self.view
    -- Code here runs when the scene is first created but has not yet appeared on screen
    myData = utility.loadTable("myData.json")

    local board = display.newImageRect("assets/images/guide.png", 525, 320)
    board.x = display.contentCenterX
    board.y = display.contentCenterY
    sceneGroup:insert(board)

    local btn_back = display.newImageRect( "assets/images/btnback.png", 120, 34 )
    btn_back.theme_name = "lol"
    btn_back.x = 70
    btn_back.y = 27
    btn_back:addEventListener( "touch", handlerBtnOk )
    sceneGroup:insert(btn_back)

end

-- show()
function scene:show( event )
    local sceneGroup = self.view
    local phase = event.phase

    if ( phase == "will" ) then
        -- Code here runs when the scene is still off screen (but is about to come on screen)

    elseif ( phase == "did" ) then
        -- Code here runs when the scene is entirely on screen

    end
end


-- hide()
function scene:hide( event )

    local sceneGroup = self.view
    local phase = event.phase

    if ( phase == "will" ) then
        -- Code here runs when the scene is on screen (but is about to go off screen)

    elseif ( phase == "did" ) then
        -- Code here runs immediately after the scene goes entirely off screen

    end
end


-- destroy()
function scene:destroy( event )
    local sceneGroup = self.view
    -- Code here runs prior to the removal of scene's view
    sceneGroup:removeSelf( )
    print "removeScene called"
end

-- -----------------------------------------------------------------------------------
-- Scene event function listeners
-- -----------------------------------------------------------------------------------
scene:addEventListener( "create", scene )
scene:addEventListener( "show", scene )
scene:addEventListener( "hide", scene )
scene:addEventListener( "destroy", scene )
-- -----------------------------------------------------------------------------------

return scene