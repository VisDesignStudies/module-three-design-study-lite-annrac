class SeriesChart {

    constructor(data){

        this.tag = data.tag
        this.title = data.title || ''
        this.series = JSON.parse(JSON.stringify(data.series)) || {} //<-- strange non-reference object copy workaround

        this.color_schemes = data.colors || ["#fd7f6f", "#7eb0d5", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7"]


        this.xsize = data.width || 620
        this.ysize = data.height || 250

        this.x_label = data.x_label || ''
        this.y_label = data.y_label || ''
        
        this.middle_axis = false

        //check options if we need to reorganize our data format
        if(data.reorganize){
            this.organizeSeriesData(data.reorganize)
        }

        this.colormap = {}

        //options for user
        this.options = {
            line: true,
            uncertainty: false,
            points: true
        }

        this.visible = JSON.parse(JSON.stringify(this.series)) || {}

        this.margin = data.margin || {top: 20, right: 90, bottom: 50, left: 100}
        this.width = this.xsize - this.margin.left - this.margin.right
        this.height = this.ysize - this.margin.top - this.margin.bottom

    }

    clear(){
        this.svg.selectAll("*").remove();
    }

    truncateAllData(){
        for(var series in this.series){
            var data = this.series[series]
            data.forEach(record => {
                record.value = utils.truncateDecimals(record.value, 2)
                record.time = utils.truncateDecimals(record.time, 2)
            })
        }
    }

    organizeSeriesData(key){

        var seriesObj = {}
        this.series.forEach(record => {
            var name = record[key]
            if(!(name in seriesObj)){
                seriesObj[name] = []
            }
            seriesObj[name].push(record)
        })

        this.series = seriesObj

    }

    //append color object to each record
    assignSeriesColors(){
        var colorindex = 0
        for(var satID in this.series){
            var color = this.color_schemes[colorindex]
            this.series[satID].forEach((record) => { record.color = color })
            colorindex++
        }
    }

    cleanTrack(track){
        return track.slice(0, 16);
    }

    //option handling
    toggleOption(option, value){
        this.options[option] = value
        this.rerenderSeries()
    }

    initOptions(){
        var uncertainty_toggle = document.getElementById(`uncertainty_switch`)
        this.options['uncertainty'] = uncertainty_toggle.checked

        var line_toggle = document.getElementById(`line_switch`)
        this.options['line'] = line_toggle.checked
    }

    updateData(data){
        this.tag = data.tag
        this.tracks = data.tracks
        this.title = data.title || ''
    }

    init(){

        var chart_tag_id = this.tag
        this.svg = d3.select(`#${chart_tag_id}`)
        .append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")

    }

    // gridlines in x axis function
    make_x_gridlines(x) {		
        return d3.axisBottom(x)
            .ticks(5)
    }

    // gridlines in y axis function
    make_y_gridlines(y) {		
        return d3.axisLeft(y)
            .ticks(5)
    }

    getXYScale(track){

        this.x = d3.scaleTime()
            .domain(d3.extent(track, function(d) { return new Date(+d['time'], 0, 1); }))
            .range([ 0, this.width ]);
        
        
        this.y = d3.scaleLinear()
        .domain([0, d3.max(track, function(d) { return +d['value']; })])
            .range([ this.height, 0 ])
      
/*
        this.y = d3.scaleLinear()
            .domain([0, d3.max(track, function(d) { return +d['upper_ci']; })])
            .range([ this.height, 0 ])
*/
        }

    //render the chart itself, no data quite yet
    //flatten all our series, to get the scale across all series
    renderGrid(){

        //first, merge our arrays
        var track = []
        for(var seriesIndex in this.visible){
            track = track.concat(this.visible[seriesIndex])
        }

        //var track = this.series.flat()
        var title = this.title || ''

        //get x-y scale of track
        this.getXYScale(track)
        var x = this.x
        var y = this.y
    
        this.svg.append("g")
        //.attr("class", "axisLight")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(x)
        .tickFormat(d3.timeFormat("%Y")));

        this.svg.append("g")
        //.attr("class", "axisLight")
        .call(d3.axisLeft(y))
        
        //add the X gridlines
        this.svg.append("g")			
        .attr("class", "grid")
        .attr("transform", "translate(0," + this.height + ")")
        .call(this.make_x_gridlines(x)
            .tickSize(-this.height)
            .tickFormat("")
        )

        // add the Y gridlines
        this.svg.append("g")			
        .attr("class", "grid")
        .call(this.make_y_gridlines(y)
            .tickSize(-this.width)
            .tickFormat("")
        )

        //add title
        this.svg.append("text")
            .attr("x", (this.width / 2))             
            .attr("y", 0 - (this.margin.top / 2))
            .attr("text-anchor", "middle")  
            //.attr("class", "titleLight")
            .text(title);

        //vertical axis label
        this.svg.append('g')
            //.attr("class", "axisLabelLight")
            .attr('transform', 'translate(' + -70 + ', ' +  this.height / 2 + ')')
            .append('text')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90)')
                .text(this.y_label)


        //horizontal axis label
        this.svg.append('g')
            //.attr("class", "axisLabelLight")
            .attr('transform', 'translate(' + this.width/2 + ', ' +  (this.height+40) + ')')
            .append('text')
                .attr('text-anchor', 'middle')
                .text(this.x_label)
                
    }

    appendLegend(){
    
        var self = this
        var index = 0
        for(var series in this.series){
            var color = this.color_schemes[index]

            //append color circle
            this.svg.append("circle")
                .attr("cx",this.width+30)
                .attr("cy",20 + (index * 25))
                .attr("r", 5)
                .attr("name", series)
                .attr("display", "on")
                .style("fill", color)

            //name of series (sat id/average)
            this.svg.append("text")
                .attr("x", this.width+45)
                .attr("y", 25 + (index * 25))
                .text(series)
                .style("font-size", "15px")
                //.attr("class", "legendLabelLight")
                .attr("alignment-baseline","middle")

            index++
        }

    }

    filterTopStates(numberOfStates){

        let sorted = []
        for(let state in this.series){
            sorted.push({
                state: state,
                value: this.getStateAverage(state)
            })
        }

        sorted.sort(function(a, b) {
            return (b.value) - (a.value);
        });

        let spliced = sorted.slice(0, numberOfStates)
        let statesToInclude = []
        spliced.forEach(rec => { statesToInclude.push(rec.state) })
        
        let filtered = {}
        statesToInclude.forEach(state => {
            filtered[state] = this.series[state]
        })
        this.series = filtered
        return filtered
        
        //return sorted.slice(0, numberOfStates);
        
    }  

    getStateAverage(state){

        let data = this.series[state]
        let total = 0
        data.forEach(record => {
            total += Number(record.value)
        })
        return total / data.length

    }

    drawSeries(){

        let x = this.x
        let y = this.y

        var div = d3.select("body").append("div")	
            .attr("class", "tooltip")				
            .style("opacity", 0)
            .style("border-radius", "5px")

            //grab arbitrary color from first index

            for(let state in this.series){

                let series = this.series[state]

                var color = series[0].color

                this.svg.append("path")
                .datum(series)
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", 2.5)
                    .attr("d", d3.line()
                        .x(function(d) { return x(new Date(+d['time'], 0, 1)) })
                        .y(function(d) { return y(+d['value']) })
                        .curve(d3.curveCatmullRom)
                )
/*
                var rad = 4
                var rhov = 12

                this.svg.append('g')
                    .selectAll("points")
                    .data(series)
                    .enter()
                    .append("circle")
                        .attr("class", "points")
                        .attr("cx", function (d) { return x(new Date(+d['time'], 0, 1)) } )
                        .attr("cy", function (d) { return y(d['value']); } )
                        .attr("opacity", .8)
                        .attr("r", rad)
                        .style("fill", color)
                        .on('mouseover', function(event){

                            var data = d3.select(this).data()[0]
                            
                            //make our hovered point bigger
                            d3.select(this)
                                .style("cursor", "pointer")
                                .transition()
                                .duration(200)
                                .attr('r', rhov)
                                .attr("opacity", 1)
        
                            //add our tooltip
                            
                            div.transition()		
                                .duration(200)		
                                .style("opacity", .9);		
                            div	.html(`<small>Amount:</small> ${data.value}<br><small>Year:</small> ${data.time}`)	
                            .style("left", (d3.event.pageX) + "px")		
                            .style("top", (d3.event.pageY - 70) + "px");	
                            
        
                        })
                        .on('mouseout', function(){
        
                            //put circle back to normal size
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r',rad)
                                .attr("opacity", .8)
        
                            //remove tooltip
                            div.transition()		
                                .duration(500)		
                                .style("opacity", 0);
                            
                        })
*/
                    }
                        
    }
 
}