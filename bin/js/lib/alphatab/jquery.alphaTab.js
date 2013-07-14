(function($) 
{
    var api = {};
    
    function scoreLoaded(context, score)
    {
        try
        {
            context.renderer.render(score.tracks[context.settings.track]);
        }
        catch(e)
        {
            if(e instanceof Error) throw e;
            else $.error(e);
        }
    }


    /*
     * alphaTab initialization
     */
    function init ( options ) 
    {
        return this.each(function() 
        {
            // check for reinitialize
            var $this = $(this),
                data = $this.data('alphaTab');
            if(!data) 
            {
                //
                // Settings
                var context = {};
                
                context.settings = $.extend( alphatab.Settings.defaults(), options);
                context.settings = $.extend( {track: 0}, context.settings);
                
                
                var contents = $.trim($this.text());
                $this.html('');
                
                //
                // Create context elements (wrapper, canvas etc)
                if(context.settings.engine == "html5" || context.settings.engine == "default")
                {
                    // HACK: call createElement('canvas') once before. this ensures that the browser knows the element
                    document.createElement('canvas'); 
                    context.canvas = $('<canvas width="'+context.settings.width+'" height="'+context.settings.height+'" class="alphaTabSurface"></canvas>');
                    $this.append(context.canvas);
                    context.canvas = context.canvas[0];
                    if($.browser.msie) 
                    {
                        // Excanvas initialization
                        if($.browser.version < 9)
                        {
                            var fixElement_ = function(el) 
                            {
                               // in IE before version 5.5 we would need to add HTML: to the tag name
                               // but we do not care about IE before version 6
                               var outerHTML = el.outerHTML;
                             
                               var newEl = el.ownerDocument.createElement(outerHTML);
                               // if the tag is still open IE has created the children as siblings and
                               // it has also created a tag with the name "/FOO"
                               if (outerHTML.slice(-2) != "/>") 
                               {
                                     var tagName = "/" + el.tagName;
                                     var ns;
                                     // remove content
                                     while ((ns = el.nextSibling) && ns.tagName != tagName) 
                                     {
                                       ns.removeNode();
                                     }
                                     // remove the incorrect closing tag
                                     if (ns) 
                                     {
                                       ns.removeNode();
                                     }
                               }
                               el.parentNode.replaceChild(newEl, el);
                               return newEl;
                            };
                            
                            context.canvas = G_vmlCanvasManager.initElement(fixElement_(context.canvas));
                        }
                    }
                }
                else
                {
                    context.canvas = $('<div class="alphaTabCanvasWrapper"></div>');
                    $this.append(context.canvas);
                }
                
                //
                // Renderer setup
                context.renderer = new alphatab.rendering.ScoreRenderer(context.settings, context.canvas);
                
                // in case of SVG we hook into the renderer to create the svg element after rendering
                if(context.settings.engine == "svg") 
                {
                    context.renderer.onFinished = function() 
                    {
                        context.canvas.children().remove(); // remove old svg 
                        var canvas = context.renderer.canvas;
                        var svgElement = $(canvas.toSvg(true, "alphaTabSurface"));
                        context.canvas.append(svgElement);
                    };
                }
                
                $this.data('alphaTab', context);                
                
                //
                // Load default data
                if(contents != "") 
                {
                    api.tex.apply(this, [contents]);
                }
                else if($this.data('file') != '') 
                {
                    alphatab.importer.ScoreLoader.loadScoreAsync($this.data('file'), 
                    function(score)
                    {
                        scoreLoaded(context, score);
                    }, 
                    function (error)
                    {
                        $.error(error);
                    });
                }
            }
        });
    }
    
    /*
     * Open alphaTab file
     * @param {String} url the url to load the data via ajax
     * @param {Number} track the track index to load initially 
     * @param {Function} success the callback function to call after successful track display
     * @param {Function} error the callback function to call after any error during loading or rendering
     */
    function load( url, track, success, error ) 
    {
        var context = $(this).data('alphaTab');
        if(!context) { $.error('alphaTab not initialized!'); }
        alphatab.importer.ScoreLoader.loadScoreAsync(url, 
        function(score)
        {
            scoreLoaded(context, score);
        }, 
        function (error)
        {
            $.error(error);
        });
    }
    
    /**
     * Load alphaTex source
     * @param {String} content the alphaTex source code to load
     * @param {Function} success the callback function to call after successful track display
     * @param {Function} error the callback function to call after any error during loading or rendering
     */
    function tex ( content, success, error ) 
    {
        var context = $(this).data('alphaTab');
        if(!context) { $.error('alphaTab not initialized!'); }

        var score = null;
        try 
        {
            var parser = new alphatab.importer.AlphaTexImporter();
            var data = new haxe.io.BytesInput(haxe.io.Bytes.ofString(tex));
            parser.init(data);
            score = parser.readScore();
        }
        catch(e) 
        {
            $.error(e);
        }
        
        if(score != null) 
        {
            scoreLoaded(context, score);
        }
    }
    
    /**
     * Switches the displayed track of the currently loaded song
     * @param {Number} track the index of the track to display
     */
    function track( track ) 
    {
        var context = $(this).data('alphaTab');
        var score = context.renderer.track.score;
        if(track < 0 || track >= score.tracks.length) return;
        
        try
        {
            context.renderer.render(score.tracks[track]);
        }
        catch(e)
        {
            if(e instanceof Error) throw e;
            else $.error(e);
        }
    }
    
    /**
     * Get the currently loaded score
     */
    function score() 
    {
        var context = $(this).data('alphaTab');
        return context.renderer.track.score;
    }

    // expose API
    api.init = init;
    api.load = load;
    api.tex = tex;
    api.track = track;
    api.score = score;
    
    
    $.fn.alphaTab = function(method) {
        if(api[method]) {
            return api[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if(typeof method === 'object' || !method) {
            return api.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.alphaTab');
        }
    };   
    
})(jQuery);



                
/**
 * VB Loader For IE 
 * This code is based on the code of 
 *     http://nagoon97.com/reading-binary-files-using-ajax/
 *     Copyright (c) 2008 Andy G.P. Na <nagoon97@naver.com>
 *     The source code is freely distributable under the terms of an MIT-style license.
 */           
document.write('<script type="text/vbscript">\n\
Function VbAjaxLoader(method, fileName)\n\
	Dim xhr\n\
	Set xhr = CreateObject("Microsoft.XMLHTTP")\n\
\n\
	xhr.Open method, fileName, False\n\
\n\
	xhr.setRequestHeader "Accept-Charset", "x-user-defined"\n\
	xhr.send\n\
\n\
	Dim byteArray()\n\
\n\
	if xhr.Status = 200 Then\n\
		Dim byteString\n\
		Dim i\n\
\n\
		byteString=xhr.responseBody\n\
\n\
		ReDim byteArray(LenB(byteString))\n\
\n\
		For i = 1 To LenB(byteString)\n\
			byteArray(i-1) = AscB(MidB(byteString, i, 1))\n\
		Next\n\
	End If\n\
\n\
	VbAjaxLoader=byteArray\n\
End Function\n\
</script>');