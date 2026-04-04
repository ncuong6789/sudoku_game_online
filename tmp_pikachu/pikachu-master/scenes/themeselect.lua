local composer = require( "composer" )
local scene = composer.newScene()
local utility = require("utility")
local myData
local theme_pokemon,theme_cat,theme_lol
-- -----------------------------------------------------------------------------------
-- Scene event functions
-- -----------------------------------------------------------------------------------

local function selector_effect( piece )
    piece.stroke = { type = "gradient",
                     color1 = { 1, 0, 0.4 },
                     color2 = { 1, 0, 0, 0.2 },
                     direction = "down" }
    piece.strokeWidth = 8
end

local function handlerThemeSelector( e )
    if e.name == "touch" and e.phase == "began" then
        local piece = e.target
        if (piece ~= nil) then
            theme_pokemon.strokeWidth = 0
            theme_cat.strokeWidth = 0
            theme_lol.strokeWidth = 0

            local theme_name = piece.theme_name;
            selector_effect(piece)
            myData.theme_name = theme_name
            utility.saveTable(myData, "myData.json")
            
        end
    end
end

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

    local board = display.newImageRect("assets/images/pokemon/bg.jpg", 640, 320)
    board.x = display.contentCenterX
    board.y = display.contentCenterY
    sceneGroup:insert(board)

    theme_pokemon = display.newImageRect( "assets/images/pokemon/1.jpg", 100, 100 )
    theme_pokemon.theme_name = "pokemon"
    theme_pokemon.x = display.contentCenterX - 110
    theme_pokemon.y = display.contentCenterY - 20
    theme_pokemon:addEventListener( "touch", handlerThemeSelector )
    sceneGroup:insert(theme_pokemon)

    theme_cat = display.newImageRect( "assets/images/cat/1.jpg", 100, 100 )
    theme_cat.theme_name = "cat"
    theme_cat.x = display.contentCenterX 
    theme_cat.y = display.contentCenterY - 20
    theme_cat:addEventListener( "touch", handlerThemeSelector )
    sceneGroup:insert(theme_cat)


    theme_lol = display.newImageRect( "assets/images/lol/1.jpg", 100, 100 )
    theme_lol.theme_name = "lol"
    theme_lol.x = display.contentCenterX + 110
    theme_lol.y = display.contentCenterY - 20
    theme_lol:addEventListener( "touch", handlerThemeSelector )
    sceneGroup:insert(theme_lol)

    if(myData.theme_name == "pokemon") then
       selector_effect(theme_pokemon)
    elseif (myData.theme_name == "cat") then
        selector_effect(theme_cat)
    else
       selector_effect(theme_lol)
    end

    local btn_back = display.newImageRect( "assets/images/btnok.png", 120, 34 )
    btn_back.theme_name = "lol"
    btn_back.x = display.contentCenterX
    btn_back.y = display.contentCenterY + 70
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