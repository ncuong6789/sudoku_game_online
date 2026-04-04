
-- Version: 1.1
---------------------------------------------------------------------------------------

local widget = require( "widget" )

local M = {}
M.resumeBtnRelease = function (event)

end

M.homeBtnRelease = function (event)	

end

M.quitBtnRelease = function (event)
	
end

local infoShowing = false

function M:newUI( options )

	local backGroup = display.newGroup()
	local frontGroup = display.newGroup()
	local modalGroupContainer = display.newContainer( 288, 240 ) ; frontGroup:insert( modalGroupContainer )
	local scrollBounds
	local infoBoxState = "canOpen"
	local transComplete
	local offsetX = (display.actualContentWidth-display.contentWidth)/2
	local offsetY = (display.actualContentHeight-display.contentHeight)/2

	modalGroupContainer:toBack()

	-- Check system for font selection
	local useFont
	if "Win" == system.getInfo( "platformName" ) then useFont = native.systemFont
	elseif "Android" == system.getInfo( "platformName" ) then useFont = native.systemFont
	else useFont = "HelveticaNeue-Light"
	end
	self.appFont = useFont

	-- Create shade rectangle
	local screenShade = display.newRect( frontGroup, 0, 0, display.contentWidth+400, display.contentHeight+400 )
	screenShade:setFillColor( 0,0,0 ) ; screenShade.alpha = 0
	screenShade.x, screenShade.y = display.contentCenterX, display.contentCenterY
	screenShade.isHitTestable = false ; screenShade:toBack()

	-- Create info button (initially invisible)

	local infoButton = display.newText( frontGroup, "MENU", 25, 25 , useFont  )
	infoButton.anchorX = 1
	infoButton.isVisible = false
	infoButton.id = "infoButton"

	-- Create table for initial object positions
	local objPos = { infoBoxOffY=0, infoBoxDestY=0 }

	-- Position core objects
	objPos["infoBoxOffY"] = -130-offsetY
	objPos["infoBoxDestY"] = 158-offsetY
	
	modalGroupContainer.x = display.contentCenterX
	infoButton.x, infoButton.y = display.contentWidth+offsetX-3, 10


		-- Create the info box scrollview
		scrollBounds = widget.newScrollView
		{
			x = 160,
			y = objPos["infoBoxDestY"],
			width = 288,
			height = 240,
			horizontalScrollDisabled = true,
			hideBackground = true,
			topPadding = 0,
			bottomPadding = 0
		}
		scrollBounds:setIsLocked( true )
		scrollBounds.x, scrollBounds.y = display.contentCenterX, objPos["infoBoxOffY"]
		frontGroup:insert( scrollBounds )

		local infoBoxBack = display.newRect( 0, 0, 288, 240 )

		modalGroupContainer:insert( infoBoxBack )

		-- Create the info text group
		local modalGroup = display.newGroup()
		modalGroupContainer:insert( modalGroup )

		local infoText = display.newText( modalGroup, "Game Paused", display.contentCenterX, 0, 0, 0, useFont, 30 )
		infoText:setFillColor( 0 )

		local btnlabelColor = {
		      default = {1,0,0},
		      over = {0,1,1}
		}
		local resumeBtn = widget.newButton{
		    label = "Resume game",
		    labelColor = btnlabelColor,
		    fontSize = 20,
		    width = 150,
		    emboss = true,
		    onRelease = M.resumeBtnRelease
		  }
		resumeBtn.x = display.contentCenterX
		resumeBtn.y = display.contentHeight * 0.15

		-- Restart button
		local homeBtn = widget.newButton{
		    label = "Main menu",
		    labelColor = btnlabelColor,
		    fontSize = 20,
		    width = 140,
		    emboss = true,
		    onRelease = M.homeBtnRelease
		  }
		homeBtn.x = display.contentCenterX
		homeBtn.y = display.contentHeight * 0.3
		
		  -- Quit button
		local quitBtn = widget.newButton{
			label = "Quit game",
			labelColor = btnlabelColor,
			fontSize = 20,
			emboss = true,
			onRelease = M.quitBtnRelease
		}
		quitBtn.x = display.contentCenterX
		quitBtn.y = display.contentHeight * 0.45

		
		modalGroup:insert( resumeBtn )
		modalGroup:insert( homeBtn )
		modalGroup:insert( quitBtn )

		-- Set anchor point on info text group
		local anc = modalGroup.height/120
		modalGroup.anchorChildren = true
		modalGroup.anchorY = 1/anc

		-- Initially set info objects to invisible
		modalGroup.isVisible = false
		modalGroupContainer.isVisible = false

		transComplete = function()

			if infoBoxState == "opening" then
				scrollBounds:insert( modalGroup )
				modalGroup.x = 144 ; modalGroup.y = 120
				scrollBounds:setIsLocked( false )
				scrollBounds.x, scrollBounds.y = display.contentCenterX, objPos["infoBoxDestY"]
				infoBoxState = "canClose"
				infoShowing = true
				if self.onInfoEvent then
					self.onInfoEvent( { action="show", phase="did" } )
				end
			elseif infoBoxState == "closing" then
				modalGroup.isVisible = false
				modalGroupContainer.isVisible = false
				scrollBounds.x, scrollBounds.y = display.contentCenterX, objPos["infoBoxOffY"]
				screenShade.isHitTestable = false
				infoBoxState = "canOpen"
				infoShowing = false
				if self.onInfoEvent then
					self.onInfoEvent( { action="hide", phase="did" } )
				end
			end
		end

		local function controlInfoBox( event )
			if event.phase == "began" then
				if infoBoxState == "canOpen" then
					infoBoxState = "opening"
					infoShowing = true
					if self.onInfoEvent then
						self.onInfoEvent( { action="show", phase="will" } )
					end
					modalGroupContainer.x = display.contentCenterX
					modalGroupContainer.y = objPos["infoBoxOffY"]
					modalGroupContainer:insert( modalGroup )
					modalGroup.isVisible = true
					modalGroupContainer.isVisible = true
					modalGroupContainer.xScale = 0.96 ; modalGroupContainer.yScale = 0.96
					screenShade.isHitTestable = true
					transition.cancel( "infoBox" )
					transition.to( screenShade, { time=400, tag="infoBox", alpha=0.75, transition=easing.outQuad } )
					transition.to( modalGroupContainer, { time=900, tag="infoBox", y=objPos["infoBoxDestY"], transition=easing.outCubic } )
					transition.to( modalGroupContainer, { time=400, tag="infoBox", delay=750, xScale=1, yScale=1, transition=easing.outQuad, onComplete=transComplete } )

				elseif infoBoxState == "canClose" then
					infoBoxState = "closing"
					infoShowing = false
					if self.onInfoEvent then
						self.onInfoEvent( { action="hide", phase="will" } )
					end
					modalGroupContainer:insert( modalGroup )
					local scrollX, scrollY = scrollBounds:getContentPosition()
					modalGroup.x = 0 ; modalGroup.y = scrollY
					scrollBounds:setIsLocked( true )
					transition.cancel( "infoBox" )
					transition.to( screenShade, { time=400, tag="infoBox", alpha=0, transition=easing.outQuad } )
					transition.to( modalGroupContainer, { time=400, tag="infoBox", xScale=0.96, yScale=0.96, transition=easing.outQuad } )
					transition.to( modalGroupContainer, { time=700, tag="infoBox", delay=200, y=objPos["infoBoxOffY"], transition=easing.inCubic, onComplete=transComplete } )
				end
			end
			return true
		end

		-- Set info button tap listener
		infoButton.isVisible = false
		infoButton:addEventListener( "touch", controlInfoBox )
		infoButton.listener = controlInfoBox
		screenShade:addEventListener( "touch", controlInfoBox )
	
	self.infoButton = infoButton

	backGroup:toBack() ; self.backGroup = backGroup
	frontGroup:toFront() ; self.frontGroup = frontGroup
end

function M:isInfoShowing()
	return infoShowing
end

return M
