"""Risk metrics from a return series."""

from __future__ import annotations

import numpy as np


def sharpe_ratio(returns: list[float], risk_free: float = 0.045, periods_per_year: int = 252) -> float:
    """
    Annualized Sharpe ratio assuming `returns` are per-period simple returns.
    rf is annual risk-free rate (subtracted from mean return before scaling).
    """
    r = np.asarray(returns, dtype=float)
    r = r[np.isfinite(r)]
    if r.size < 2:
        return 0.0
    excess = r - risk_free / periods_per_year
    std = excess.std(ddof=1)
    if std < 1e-12:
        return 0.0
    return float(np.sqrt(periods_per_year) * excess.mean() / std)


def max_drawdown(returns: list[float]) -> float:
    """
    Maximum drawdown on equity curve built from simple returns (starts at 1.0).
    Returns a negative fraction (e.g. -0.25 for 25% drawdown).
    """
    r = np.asarray(returns, dtype=float)
    r = r[np.isfinite(r)]
    if r.size == 0:
        return 0.0
    equity = (1.0 + r).cumprod()
    peak = np.maximum.accumulate(equity)
    dd = equity / peak - 1.0
    return float(dd.min())


def value_at_risk(returns: list[float], confidence: float = 0.95) -> float:
    """
    Historical VaR: positive loss magnitude at the given left-tail quantile
    (default 5% → ~95% VaR on the loss side).
    """
    r = np.asarray(returns, dtype=float)
    r = r[np.isfinite(r)]
    if r.size < 5:
        return 0.0
    q = np.quantile(r, 1 - confidence)
    return float(max(0.0, -q))


def risk_summary(returns: list[float]) -> dict[str, float]:
    if not returns:
        return {"sharpe": 0.0, "max_drawdown": 0.0, "var_95": 0.0}
    return {
        "sharpe": sharpe_ratio(returns),
        "max_drawdown": max_drawdown(returns),
        "var_95": value_at_risk(returns, confidence=0.95),
    }
