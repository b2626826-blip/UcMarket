package com.ucmarket.controller;
import com.ucmarket.dto.PositionRequest;
import com.ucmarket.entity.Position;
import com.ucmarket.service.PositionService;
import org.springframework.web.bind.annotation.*;
import com.ucmarket.dto.BuyRequest;
import java.util.List;
import com.ucmarket.dto.SellRequest;
import com.ucmarket.dto.PositionPnlRequest;
@RestController
@RequestMapping("/api/positions")
public class PositionController {

    private final PositionService positionService;

    public PositionController(PositionService positionService) {
        this.positionService = positionService;
    }
@PostMapping("/pnl")
public Position updatePnl(@RequestBody PositionPnlRequest request) {
    return positionService.updatePnl(request);
}


    

    @PostMapping
    public Position createPosition(@RequestBody PositionRequest request) {
        return positionService.createPosition(request);
    }
@PostMapping("/sell")
public Position sell(@RequestBody SellRequest request) {
    return positionService.sell(request);
}



    @PostMapping("/buy")
public Position buy(@RequestBody BuyRequest request) {
    return positionService.buy(request);
}
    @GetMapping("/user/{userId}")
    public List<Position> getPositionsByUserId(@PathVariable String userId) {
        return positionService.getPositionsByUserId(userId);
    }

    @GetMapping("/user/{userId}/active")
    public List<Position> getActivePositionsByUserId(@PathVariable String userId) {
        return positionService.getActivePositionsByUserId(userId);
    }

}
